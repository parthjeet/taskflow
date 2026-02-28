from __future__ import annotations

from collections.abc import Generator
from datetime import datetime, timedelta, timezone
from typing import Any
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from httpx import Response
import pytest
from sqlalchemy import create_engine, event, select
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 - registers all models with Base.metadata
from app.api.deps import get_db
from app.db.base import Base
from app.main import create_app
from app.models.daily_update import DailyUpdate


def _truncate_to_utc_second(value: str) -> str:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.replace(microsecond=0).isoformat()


def _parse_datetime(value: object) -> datetime:
    dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _next_updated_at_timestamp(updated_at: object) -> datetime:
    return _parse_datetime(updated_at) + timedelta(seconds=2)


@pytest.fixture
def testing_session_factory() -> Generator[sessionmaker, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    @event.listens_for(engine, "connect")
    def _register_sqlite_functions(dbapi_connection, _connection_record) -> None:  # noqa: ANN001
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
        dbapi_connection.create_function("gen_random_uuid", 0, lambda: uuid.uuid4().hex)

    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)
    try:
        yield factory
    finally:
        engine.dispose()


@pytest.fixture
def client(testing_session_factory: sessionmaker) -> Generator[TestClient, None, None]:
    app = create_app()
    app.state.testing_session_factory = testing_session_factory

    def override_get_db():  # noqa: ANN202
        db = testing_session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _create_task(client: TestClient, **overrides: object) -> dict[str, Any]:
    payload: dict[str, Any] = {"title": "Parent task", "status": "To Do", "priority": "Medium"}
    payload.update(overrides)
    response = client.post("/api/v1/tasks", json=payload)
    assert response.status_code == 201
    return response.json()


def _create_member(client: TestClient, **overrides: object) -> dict[str, Any]:
    payload: dict[str, Any] = {"name": "Alice Chen", "email": "alice@example.com", "active": True}
    payload.update(overrides)
    response = client.post("/api/v1/members", json=payload)
    assert response.status_code == 201
    return response.json()


def _create_daily_update(
    client: TestClient,
    task_id: str,
    *,
    author_id: str,
    content: str = "Initial update",
) -> dict[str, Any]:
    response = client.post(
        f"/api/v1/tasks/{task_id}/updates",
        json={"author_id": author_id, "content": content},
    )
    assert response.status_code == 201
    return response.json()


def _assert_operational_error_response(response: Response) -> None:
    assert response.status_code == 503
    assert response.json() == {"error": "Database connection lost. Please retry."}
    assert response.headers["Retry-After"] == "5"


def test_create_daily_update_returns_201_with_expected_shape(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)

    response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"author_id": member["id"], "content": "Progress update"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["task_id"] == task["id"]
    assert body["author_id"] == member["id"]
    assert body["author_name"] == member["name"]
    assert body["content"] == "Progress update"
    assert body["edited"] is False
    assert str(uuid.UUID(body["id"])) == body["id"]
    assert _parse_datetime(body["created_at"]).isoformat()
    assert _parse_datetime(body["updated_at"]).isoformat()


def test_create_daily_update_strips_surrounding_whitespace(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)

    response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"author_id": member["id"], "content": "  hello  "},
    )
    assert response.status_code == 201
    assert response.json()["content"] == "hello"

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    assert task_response.json()["daily_updates"][0]["content"] == "hello"


def test_create_daily_update_exactly_1000_chars_succeeds(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    content = "x" * 1000

    response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"author_id": member["id"], "content": content},
    )
    assert response.status_code == 201
    assert response.json()["content"] == content


def test_create_daily_update_refreshes_parent_updated_at(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    before_update = _truncate_to_utc_second(str(task["updated_at"]))
    mocked_now = _next_updated_at_timestamp(task["updated_at"])

    with patch("app.crud.task.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = mocked_now
        response = client.post(
            f"/api/v1/tasks/{task['id']}/updates",
            json={"author_id": member["id"], "content": "Progress update"},
        )
    assert response.status_code == 201

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    after_update = _truncate_to_utc_second(str(task_response.json()["updated_at"]))
    assert after_update != before_update


def test_create_daily_update_rejects_unknown_author(client: TestClient) -> None:
    task = _create_task(client)

    response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"author_id": str(uuid.uuid4()), "content": "Progress update"},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "Author not found"}


def test_create_daily_update_invalid_content_returns_400(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)

    whitespace_response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"author_id": member["id"], "content": "   "},
    )
    assert whitespace_response.status_code == 400
    assert "content: String should have at least 1 character" in whitespace_response.json()["error"]

    too_long_response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"author_id": member["id"], "content": "x" * 1001},
    )
    assert too_long_response.status_code == 400
    assert "content: String should have at most 1000 characters" in too_long_response.json()["error"]

    missing_response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"author_id": member["id"]},
    )
    assert missing_response.status_code == 400
    assert "content: Field required" in missing_response.json()["error"]


def test_create_daily_update_missing_author_id_returns_400(client: TestClient) -> None:
    task = _create_task(client)

    response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"content": "Progress update"},
    )
    assert response.status_code == 400
    assert "author_id: Field required" in response.json()["error"]


def test_create_daily_update_empty_content_returns_400(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)

    response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"author_id": member["id"], "content": ""},
    )
    assert response.status_code == 400
    assert "content: String should have at least 1 character" in response.json()["error"]


def test_create_daily_update_missing_task_returns_404(client: TestClient) -> None:
    member = _create_member(client)

    response = client.post(
        f"/api/v1/tasks/{uuid.uuid4()}/updates",
        json={"author_id": member["id"], "content": "Progress update"},
    )
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}


def test_create_daily_update_operational_error_returns_503_with_retry_after(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)

    with patch(
        "app.api.v1.daily_updates.daily_update_crud.create_daily_update",
        side_effect=OperationalError("SELECT 1", {}, Exception("db down")),
    ):
        response = client.post(
            f"/api/v1/tasks/{task['id']}/updates",
            json={"author_id": member["id"], "content": "Progress update"},
        )
    _assert_operational_error_response(response)


def test_create_daily_update_integrity_error_returns_409(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)

    with patch(
        "app.api.v1.daily_updates.daily_update_crud.create_daily_update",
        side_effect=IntegrityError(
            "INSERT INTO daily_updates ...",
            {"author_id": member["id"]},
            Exception("foreign_key_violation"),
        ),
    ):
        response = client.post(
            f"/api/v1/tasks/{task['id']}/updates",
            json={"author_id": member["id"], "content": "Progress update"},
        )
    assert response.status_code == 409
    assert response.json() == {"error": "Author no longer exists"}


def test_update_daily_update_returns_200_and_sets_edited_true(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"], content="Initial update")
    before_update = _truncate_to_utc_second(str(created["updated_at"]))
    mocked_update_now = _parse_datetime(created["created_at"]) + timedelta(minutes=5)
    mocked_task_now = mocked_update_now + timedelta(seconds=1)

    with patch("app.crud.daily_update.datetime") as mocked_daily_datetime:
        mocked_daily_datetime.now.return_value = mocked_update_now
        with patch("app.crud.task.datetime") as mocked_task_datetime:
            mocked_task_datetime.now.return_value = mocked_task_now
            response = client.patch(
                f"/api/v1/tasks/{task['id']}/updates/{created['id']}",
                json={"content": "Updated content"},
            )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["task_id"] == task["id"]
    assert body["author_id"] == member["id"]
    assert body["author_name"] == member["name"]
    assert body["content"] == "Updated content"
    assert body["edited"] is True
    after_update = _truncate_to_utc_second(str(body["updated_at"]))
    assert after_update != before_update

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    assert _truncate_to_utc_second(str(task_response.json()["updated_at"])) != _truncate_to_utc_second(
        str(task["updated_at"])
    )


def test_update_daily_update_exactly_1000_chars_succeeds(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])
    content = "x" * 1000

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/updates/{created['id']}",
        json={"content": content},
    )
    assert response.status_code == 200
    assert response.json()["content"] == content
    assert response.json()["edited"] is True


def test_update_daily_update_rejects_invalid_content(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])

    whitespace_response = client.patch(
        f"/api/v1/tasks/{task['id']}/updates/{created['id']}",
        json={"content": "   "},
    )
    assert whitespace_response.status_code == 400
    assert "content: String should have at least 1 character" in whitespace_response.json()["error"]

    too_long_response = client.patch(
        f"/api/v1/tasks/{task['id']}/updates/{created['id']}",
        json={"content": "x" * 1001},
    )
    assert too_long_response.status_code == 400
    assert "content: String should have at most 1000 characters" in too_long_response.json()["error"]

    missing_response = client.patch(f"/api/v1/tasks/{task['id']}/updates/{created['id']}", json={})
    assert missing_response.status_code == 400
    assert "content: Field required" in missing_response.json()["error"]


def test_update_daily_update_null_content_returns_400(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/updates/{created['id']}",
        json={"content": None},
    )
    assert response.status_code == 400
    assert "content: Input should be a valid string" in response.json()["error"]


def test_update_daily_update_missing_task_returns_404(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])

    response = client.patch(
        f"/api/v1/tasks/{uuid.uuid4()}/updates/{created['id']}",
        json={"content": "Updated content"},
    )
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}


def test_update_daily_update_missing_update_returns_404(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/updates/{uuid.uuid4()}",
        json={"content": "Updated content"},
    )
    assert response.status_code == 404
    assert response.json() == {"error": "Daily update not found"}


def test_update_daily_update_wrong_task_update_pair_returns_404(client: TestClient) -> None:
    member = _create_member(client)
    task_one = _create_task(client, title="Task one")
    task_two = _create_task(client, title="Task two")
    created = _create_daily_update(client, task_one["id"], author_id=member["id"])

    response = client.patch(
        f"/api/v1/tasks/{task_two['id']}/updates/{created['id']}",
        json={"content": "Updated content"},
    )
    assert response.status_code == 404
    assert response.json() == {"error": "Daily update not found"}


def test_update_daily_update_forbidden_after_24_hours(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])
    created_at = _parse_datetime(created["created_at"])

    with patch("app.crud.daily_update.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = created_at + timedelta(hours=24, seconds=1)
        response = client.patch(
            f"/api/v1/tasks/{task['id']}/updates/{created['id']}",
            json={"content": "Updated content"},
        )

    assert response.status_code == 403
    assert response.json() == {"error": "Updates can only be edited within 24 hours."}


def test_update_daily_update_exactly_24_hours_is_allowed(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])
    created_at = _parse_datetime(created["created_at"])

    with patch("app.crud.daily_update.datetime") as mocked_daily_datetime:
        mocked_daily_datetime.now.return_value = created_at + timedelta(hours=24)
        with patch("app.crud.task.datetime") as mocked_task_datetime:
            mocked_task_datetime.now.return_value = created_at + timedelta(hours=24, seconds=1)
            response = client.patch(
                f"/api/v1/tasks/{task['id']}/updates/{created['id']}",
                json={"content": "Updated content"},
            )

    assert response.status_code == 200
    assert response.json()["edited"] is True


def test_update_daily_update_operational_error_returns_503_with_retry_after(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])

    with patch(
        "app.api.v1.daily_updates.daily_update_crud.update_daily_update",
        side_effect=OperationalError("SELECT 1", {}, Exception("db down")),
    ):
        response = client.patch(
            f"/api/v1/tasks/{task['id']}/updates/{created['id']}",
            json={"content": "Updated content"},
        )
    _assert_operational_error_response(response)


def test_delete_daily_update_returns_204_and_removes_update(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])
    before_update = _truncate_to_utc_second(str(task["updated_at"]))
    mocked_now = _next_updated_at_timestamp(task["updated_at"])

    with patch("app.crud.task.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = mocked_now
        response = client.delete(f"/api/v1/tasks/{task['id']}/updates/{created['id']}")
    assert response.status_code == 204

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    assert task_response.json()["daily_updates"] == []
    after_update = _truncate_to_utc_second(str(task_response.json()["updated_at"]))
    assert after_update != before_update


def test_delete_daily_update_missing_task_returns_404(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])

    response = client.delete(f"/api/v1/tasks/{uuid.uuid4()}/updates/{created['id']}")
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}


def test_delete_daily_update_missing_update_returns_404(client: TestClient) -> None:
    task = _create_task(client)

    response = client.delete(f"/api/v1/tasks/{task['id']}/updates/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json() == {"error": "Daily update not found"}


def test_delete_daily_update_wrong_task_update_pair_returns_404(client: TestClient) -> None:
    member = _create_member(client)
    task_one = _create_task(client, title="Task one")
    task_two = _create_task(client, title="Task two")
    created = _create_daily_update(client, task_one["id"], author_id=member["id"])

    response = client.delete(f"/api/v1/tasks/{task_two['id']}/updates/{created['id']}")
    assert response.status_code == 404
    assert response.json() == {"error": "Daily update not found"}


def test_delete_daily_update_forbidden_after_24_hours(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])
    created_at = _parse_datetime(created["created_at"])

    with patch("app.crud.daily_update.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = created_at + timedelta(hours=24, seconds=1)
        response = client.delete(f"/api/v1/tasks/{task['id']}/updates/{created['id']}")

    assert response.status_code == 403
    assert response.json() == {"error": "Updates can only be deleted within 24 hours."}


def test_delete_daily_update_exactly_24_hours_is_allowed(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])
    created_at = _parse_datetime(created["created_at"])

    with patch("app.crud.daily_update.datetime") as mocked_daily_datetime:
        mocked_daily_datetime.now.return_value = created_at + timedelta(hours=24)
        with patch("app.crud.task.datetime") as mocked_task_datetime:
            mocked_task_datetime.now.return_value = created_at + timedelta(hours=24, seconds=1)
            response = client.delete(f"/api/v1/tasks/{task['id']}/updates/{created['id']}")

    assert response.status_code == 204


def test_delete_daily_update_operational_error_returns_503_with_retry_after(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    created = _create_daily_update(client, task["id"], author_id=member["id"])

    with patch(
        "app.api.v1.daily_updates.daily_update_crud.delete_daily_update",
        side_effect=OperationalError("SELECT 1", {}, Exception("db down")),
    ):
        response = client.delete(f"/api/v1/tasks/{task['id']}/updates/{created['id']}")
    _assert_operational_error_response(response)


def test_get_task_includes_daily_updates_ordered_newest_first(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    first = _create_daily_update(client, task["id"], author_id=member["id"], content="First update")
    first_time = _parse_datetime(first["created_at"])

    with patch("app.crud.daily_update.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = first_time + timedelta(minutes=1)
        second_response = client.post(
            f"/api/v1/tasks/{task['id']}/updates",
            json={"author_id": member["id"], "content": "Second update"},
        )
    assert second_response.status_code == 201
    second = second_response.json()

    response = client.get(f"/api/v1/tasks/{task['id']}")
    assert response.status_code == 200
    updates = response.json()["daily_updates"]
    assert [item["id"] for item in updates] == [second["id"], first["id"]]


def test_list_tasks_includes_daily_updates_ordered_newest_first(client: TestClient) -> None:
    member = _create_member(client)
    task = _create_task(client)
    first = _create_daily_update(client, task["id"], author_id=member["id"], content="First update")
    first_time = _parse_datetime(first["created_at"])

    with patch("app.crud.daily_update.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = first_time + timedelta(minutes=1)
        second_response = client.post(
            f"/api/v1/tasks/{task['id']}/updates",
            json={"author_id": member["id"], "content": "Second update"},
        )
    assert second_response.status_code == 201
    second = second_response.json()

    response = client.get("/api/v1/tasks")
    assert response.status_code == 200
    listed_task = next(item for item in response.json() if item["id"] == task["id"])
    updates = listed_task["daily_updates"]
    assert [item["id"] for item in updates] == [second["id"], first["id"]]


def test_delete_task_cascades_to_daily_updates(
    client: TestClient,
    testing_session_factory: sessionmaker,
) -> None:
    member = _create_member(client)
    task = _create_task(client)
    first = _create_daily_update(client, task["id"], author_id=member["id"], content="First update")
    second = _create_daily_update(client, task["id"], author_id=member["id"], content="Second update")

    delete_response = client.delete(f"/api/v1/tasks/{task['id']}")
    assert delete_response.status_code == 204

    db = testing_session_factory()
    try:
        remaining_updates = list(
            db.scalars(
                select(DailyUpdate).where(
                    DailyUpdate.id.in_(
                        [
                            uuid.UUID(first["id"]),
                            uuid.UUID(second["id"]),
                        ]
                    )
                )
            )
        )
        assert remaining_updates == []
    finally:
        db.close()
