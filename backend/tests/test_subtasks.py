from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Any
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from httpx import Response
import pytest
from sqlalchemy import create_engine, event, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 - registers all models with Base.metadata
from app.api.deps import get_db
from app.db.base import Base
from app.main import create_app
from app.models.subtask import SubTask


def _truncate_to_utc_second(value: str) -> str:
    """Normalize to UTC and truncate sub-second precision for stable assertions."""
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.replace(microsecond=0).isoformat()


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


def _next_updated_at_timestamp(updated_at: object) -> datetime:
    dt = datetime.fromisoformat(str(updated_at))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt + timedelta(seconds=2)


def _create_task(client: TestClient, **overrides: object) -> dict[str, Any]:
    payload: dict[str, Any] = {"title": "Parent task", "status": "To Do", "priority": "Medium"}
    payload.update(overrides)
    response = client.post("/api/v1/tasks", json=payload)
    assert response.status_code == 201
    return response.json()


def _create_subtask(client: TestClient, task_id: str, *, title: str = "Sub-task") -> dict[str, Any]:
    response = client.post(f"/api/v1/tasks/{task_id}/subtasks", json={"title": title})
    assert response.status_code == 201
    return response.json()


def _assert_operational_error_response(response: Response) -> None:
    assert response.status_code == 503
    assert response.json() == {"error": "Database connection lost. Please retry."}
    assert response.headers["Retry-After"] == "5"


@contextmanager
def _track_sql_write_statements(engine: object) -> Generator[list[str], None, None]:
    """Capture SQL write statements executed while the context is active."""
    write_statements: list[str] = []

    def _track_writes(
        _conn: object,
        _cursor: object,
        statement: str,
        _parameters: object,
        _context: object,
        _executemany: bool,
    ) -> None:
        normalized_statement = statement.lstrip().upper()
        if normalized_statement.startswith(("UPDATE ", "INSERT ", "DELETE ")):
            write_statements.append(statement)

    event.listen(engine, "before_cursor_execute", _track_writes)
    try:
        yield write_statements
    finally:
        event.remove(engine, "before_cursor_execute", _track_writes)


def test_create_subtask_returns_201_with_expected_shape(client: TestClient) -> None:
    task = _create_task(client)

    response = client.post(f"/api/v1/tasks/{task['id']}/subtasks", json={"title": "Write tests"})
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["task_id"] == task["id"]
    assert response_data["title"] == "Write tests"
    assert response_data["completed"] is False
    assert response_data["position"] == 0
    created_id = uuid.UUID(response_data["id"])
    assert str(created_id) == response_data["id"]
    created_at = datetime.fromisoformat(str(response_data["created_at"]).replace("Z", "+00:00"))
    assert created_at.isoformat()


def test_create_subtask_assigns_sequential_positions(client: TestClient) -> None:
    task = _create_task(client)

    first = _create_subtask(client, str(task["id"]), title="First")
    second = _create_subtask(client, str(task["id"]), title="Second")
    third = _create_subtask(client, str(task["id"]), title="Third")

    assert [first["position"], second["position"], third["position"]] == [0, 1, 2]


def test_create_subtask_after_all_deleted_resets_position_to_zero(client: TestClient) -> None:
    task = _create_task(client)
    first = _create_subtask(client, str(task["id"]), title="Only")

    delete_response = client.delete(f"/api/v1/tasks/{task['id']}/subtasks/{first['id']}")
    assert delete_response.status_code == 204

    recreated = _create_subtask(client, str(task["id"]), title="Recreated")
    assert recreated["position"] == 0


def test_get_task_includes_subtasks_ordered_by_position(client: TestClient) -> None:
    task = _create_task(client)
    first = _create_subtask(client, str(task["id"]), title="First")
    second = _create_subtask(client, str(task["id"]), title="Second")
    third = _create_subtask(client, str(task["id"]), title="Third")

    response = client.get(f"/api/v1/tasks/{task['id']}")
    assert response.status_code == 200
    body = response.json()
    assert "sub_tasks" in body
    assert [item["id"] for item in body["sub_tasks"]] == [first["id"], second["id"], third["id"]]
    assert [item["position"] for item in body["sub_tasks"]] == [0, 1, 2]


def test_list_tasks_includes_subtasks_ordered_by_position(client: TestClient) -> None:
    task = _create_task(client)
    first = _create_subtask(client, str(task["id"]), title="First")
    second = _create_subtask(client, str(task["id"]), title="Second")
    third = _create_subtask(client, str(task["id"]), title="Third")

    response = client.get("/api/v1/tasks")
    assert response.status_code == 200
    collection = response.json()
    listed_task = next(item for item in collection if item["id"] == task["id"])

    assert "sub_tasks" in listed_task
    assert [item["id"] for item in listed_task["sub_tasks"]] == [first["id"], second["id"], third["id"]]
    assert [item["position"] for item in listed_task["sub_tasks"]] == [0, 1, 2]


def test_create_task_response_includes_empty_sub_tasks(client: TestClient) -> None:
    task = _create_task(client, title="Task without sub-tasks")
    assert task["sub_tasks"] == []


def test_create_subtask_refreshes_parent_updated_at(client: TestClient) -> None:
    task = _create_task(client)
    before_update = _truncate_to_utc_second(str(task["updated_at"]))
    mocked_now = _next_updated_at_timestamp(task["updated_at"])

    with patch("app.crud.task.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = mocked_now
        response = client.post(f"/api/v1/tasks/{task['id']}/subtasks", json={"title": "Write tests"})
    assert response.status_code == 201

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    after_update = _truncate_to_utc_second(str(task_response.json()["updated_at"]))
    assert after_update != before_update


def test_create_subtask_rejects_more_than_20_for_a_task(client: TestClient) -> None:
    task = _create_task(client)
    for idx in range(20):
        _create_subtask(client, str(task["id"]), title=f"Sub-task {idx + 1}")

    response = client.post(f"/api/v1/tasks/{task['id']}/subtasks", json={"title": "Overflow sub-task"})
    assert response.status_code == 400
    assert response.json() == {"error": "Maximum of 20 sub-tasks per task"}


def test_create_subtask_missing_task_returns_404(client: TestClient) -> None:
    response = client.post(f"/api/v1/tasks/{uuid.uuid4()}/subtasks", json={"title": "Write tests"})
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}


def test_create_subtask_invalid_title_returns_400(client: TestClient) -> None:
    task = _create_task(client)

    whitespace_response = client.post(f"/api/v1/tasks/{task['id']}/subtasks", json={"title": "   "})
    assert whitespace_response.status_code == 400
    assert "title: String should have at least 1 character" in whitespace_response.json()["error"]

    too_long_response = client.post(f"/api/v1/tasks/{task['id']}/subtasks", json={"title": "x" * 201})
    assert too_long_response.status_code == 400
    assert "title: String should have at most 200 characters" in too_long_response.json()["error"]


def test_create_subtask_operational_error_returns_503_with_retry_after(client: TestClient) -> None:
    task = _create_task(client)

    with patch(
        "app.api.v1.subtasks.subtask_crud.create_subtask",
        side_effect=OperationalError("SELECT 1", {}, Exception("db down")),
    ):
        response = client.post(f"/api/v1/tasks/{task['id']}/subtasks", json={"title": "Write tests"})
    _assert_operational_error_response(response)


def test_create_subtask_missing_title_returns_400(client: TestClient) -> None:
    task = _create_task(client)

    missing_title_response = client.post(f"/api/v1/tasks/{task['id']}/subtasks", json={})
    assert missing_title_response.status_code == 400
    assert "title: Field required" in missing_title_response.json()["error"]

    null_title_response = client.post(f"/api/v1/tasks/{task['id']}/subtasks", json={"title": None})
    assert null_title_response.status_code == 400
    assert "title:" in null_title_response.json()["error"]


def test_toggle_subtask_flips_completed_and_refreshes_parent_updated_at(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]), title="Toggle me")
    mocked_now = _next_updated_at_timestamp(task["updated_at"])

    with patch("app.crud.task.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = mocked_now
        first_response = client.patch(f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}/toggle")
        second_response = client.patch(f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}/toggle")
    assert first_response.status_code == 200
    assert first_response.json()["id"] == subtask["id"]
    assert first_response.json()["task_id"] == task["id"]
    assert first_response.json()["title"] == subtask["title"]
    assert first_response.json()["completed"] is True
    assert first_response.json()["position"] == subtask["position"]
    assert first_response.json()["created_at"] == subtask["created_at"]
    assert second_response.status_code == 200
    assert second_response.json()["id"] == subtask["id"]
    assert second_response.json()["task_id"] == task["id"]
    assert second_response.json()["title"] == subtask["title"]
    assert second_response.json()["completed"] is False
    assert second_response.json()["position"] == subtask["position"]
    assert second_response.json()["created_at"] == subtask["created_at"]

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    assert _truncate_to_utc_second(str(task_response.json()["updated_at"])) != _truncate_to_utc_second(str(task["updated_at"]))


def test_toggle_subtask_missing_subtask_returns_404(client: TestClient) -> None:
    task = _create_task(client)
    response = client.patch(f"/api/v1/tasks/{task['id']}/subtasks/{uuid.uuid4()}/toggle")
    assert response.status_code == 404
    assert response.json() == {"error": "Sub-task not found"}


def test_toggle_subtask_missing_task_returns_404(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]))

    response = client.patch(f"/api/v1/tasks/{uuid.uuid4()}/subtasks/{subtask['id']}/toggle")
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}


def test_toggle_subtask_operational_error_returns_503_with_retry_after(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]))

    with patch(
        "app.api.v1.subtasks.subtask_crud.toggle_subtask",
        side_effect=OperationalError("SELECT 1", {}, Exception("db down")),
    ):
        response = client.patch(f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}/toggle")
    _assert_operational_error_response(response)


def test_update_subtask_title_returns_updated_object(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]), title="Original title")
    before_update = _truncate_to_utc_second(str(task["updated_at"]))
    mocked_now = _next_updated_at_timestamp(task["updated_at"])

    with patch("app.crud.task.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = mocked_now
        response = client.patch(
            f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}",
            json={"title": "Updated title"},
        )
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["id"] == subtask["id"]
    assert response_data["task_id"] == task["id"]
    assert response_data["title"] == "Updated title"
    assert response_data["completed"] is False
    assert response_data["position"] == 0
    assert response_data["created_at"] == subtask["created_at"]

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    after_update = _truncate_to_utc_second(str(task_response.json()["updated_at"]))
    assert after_update != before_update


def test_update_subtask_same_title_behavior(
    client: TestClient, testing_session_factory: sessionmaker
) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]), title="Stable title")
    baseline_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert baseline_response.status_code == 200
    before_update = _truncate_to_utc_second(str(baseline_response.json()["updated_at"]))
    engine = testing_session_factory.kw.get("bind")
    assert engine is not None

    with _track_sql_write_statements(engine) as write_statements:
        response = client.patch(
            f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}",
            json={"title": "Stable title"},
        )

    assert response.status_code == 200
    response_data = response.json()
    assert response_data["id"] == subtask["id"]
    assert response_data["task_id"] == task["id"]
    assert response_data["title"] == "Stable title"
    assert response_data["completed"] is False
    assert response_data["position"] == subtask["position"]
    assert response_data["created_at"] == subtask["created_at"]
    assert write_statements == []

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    assert _truncate_to_utc_second(str(task_response.json()["updated_at"])) == before_update


def test_update_subtask_missing_task_returns_404(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]), title="Original title")

    response = client.patch(
        f"/api/v1/tasks/{uuid.uuid4()}/subtasks/{subtask['id']}",
        json={"title": "Updated title"},
    )
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}


def test_update_subtask_missing_subtask_returns_404(client: TestClient) -> None:
    task = _create_task(client)

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/subtasks/{uuid.uuid4()}",
        json={"title": "Updated title"},
    )
    assert response.status_code == 404
    assert response.json() == {"error": "Sub-task not found"}


def test_update_subtask_invalid_title_returns_400(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]), title="Original title")

    whitespace_response = client.patch(
        f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}",
        json={"title": "   "},
    )
    assert whitespace_response.status_code == 400
    assert "title: String should have at least 1 character" in whitespace_response.json()["error"]

    too_long_response = client.patch(
        f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}",
        json={"title": "x" * 201},
    )
    assert too_long_response.status_code == 400
    assert "title: String should have at most 200 characters" in too_long_response.json()["error"]


def test_update_subtask_missing_title_returns_400(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]), title="Original title")

    missing_title_response = client.patch(f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}", json={})
    assert missing_title_response.status_code == 400
    assert "title: Field required" in missing_title_response.json()["error"]

    null_title_response = client.patch(
        f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}",
        json={"title": None},
    )
    assert null_title_response.status_code == 400
    assert "title:" in null_title_response.json()["error"]


def test_update_subtask_operational_error_returns_503_with_retry_after(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]), title="Original title")

    with patch(
        "app.api.v1.subtasks.subtask_crud.update_subtask",
        side_effect=OperationalError("SELECT 1", {}, Exception("db down")),
    ):
        response = client.patch(
            f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}",
            json={"title": "Updated title"},
        )
    _assert_operational_error_response(response)


def test_reorder_subtasks_updates_order_and_positions(client: TestClient) -> None:
    task = _create_task(client)
    first = _create_subtask(client, str(task["id"]), title="First")
    second = _create_subtask(client, str(task["id"]), title="Second")
    third = _create_subtask(client, str(task["id"]), title="Third")
    before_update = _truncate_to_utc_second(str(task["updated_at"]))
    mocked_now = _next_updated_at_timestamp(task["updated_at"])

    with patch("app.crud.task.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = mocked_now
        response = client.put(
            f"/api/v1/tasks/{task['id']}/subtasks/reorder",
            json={"sub_task_ids": [third["id"], first["id"], second["id"]]},
        )
    assert response.status_code == 200
    reordered_ids = [item["id"] for item in response.json()]
    assert reordered_ids == [third["id"], first["id"], second["id"]]
    reordered_positions = [item["position"] for item in response.json()]
    assert reordered_positions == [0, 1, 2]
    reordered_items = {item["id"]: item for item in response.json()}
    for original in (first, second, third):
        reordered = reordered_items[original["id"]]
        assert reordered["task_id"] == task["id"]
        assert reordered["title"] == original["title"]
        assert reordered["completed"] is False
        assert reordered["created_at"] == original["created_at"]

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    assert _truncate_to_utc_second(str(task_response.json()["updated_at"])) != before_update
    listed_ids = [item["id"] for item in task_response.json()["sub_tasks"]]
    assert listed_ids == [third["id"], first["id"], second["id"]]

    tasks_response = client.get("/api/v1/tasks")
    assert tasks_response.status_code == 200
    listed_ids_in_collection = [item["id"] for item in tasks_response.json()[0]["sub_tasks"]]
    assert listed_ids_in_collection == [third["id"], first["id"], second["id"]]


def test_reorder_subtasks_same_order_is_noop(
    client: TestClient, testing_session_factory: sessionmaker
) -> None:
    task = _create_task(client)
    first = _create_subtask(client, str(task["id"]), title="First")
    second = _create_subtask(client, str(task["id"]), title="Second")
    third = _create_subtask(client, str(task["id"]), title="Third")
    baseline_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert baseline_response.status_code == 200
    before_update = _truncate_to_utc_second(str(baseline_response.json()["updated_at"]))
    engine = testing_session_factory.kw.get("bind")
    assert engine is not None

    with _track_sql_write_statements(engine) as write_statements:
        response = client.put(
            f"/api/v1/tasks/{task['id']}/subtasks/reorder",
            json={"sub_task_ids": [first["id"], second["id"], third["id"]]},
        )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [first["id"], second["id"], third["id"]]
    assert [item["position"] for item in response.json()] == [0, 1, 2]
    assert write_statements == []

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    assert _truncate_to_utc_second(str(task_response.json()["updated_at"])) == before_update


def test_reorder_subtasks_rejects_mismatched_payload(client: TestClient) -> None:
    task = _create_task(client)
    first = _create_subtask(client, str(task["id"]), title="First")
    _create_subtask(client, str(task["id"]), title="Second")

    response = client.put(
        f"/api/v1/tasks/{task['id']}/subtasks/reorder",
        json={"sub_task_ids": [first["id"]]},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "sub_task_ids: must include each existing sub-task exactly once"}


def test_reorder_subtasks_rejects_duplicate_ids(client: TestClient) -> None:
    task = _create_task(client)
    first = _create_subtask(client, str(task["id"]), title="First")
    _create_subtask(client, str(task["id"]), title="Second")

    response = client.put(
        f"/api/v1/tasks/{task['id']}/subtasks/reorder",
        json={"sub_task_ids": [first["id"], first["id"]]},
    )
    assert response.status_code == 400
    assert "sub_task_ids: must not contain duplicates" in response.json()["error"]


def test_reorder_subtasks_missing_task_returns_404(client: TestClient) -> None:
    response = client.put(
        f"/api/v1/tasks/{uuid.uuid4()}/subtasks/reorder",
        json={"sub_task_ids": [str(uuid.uuid4())]},
    )
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}


def test_reorder_subtasks_rejects_more_than_20_ids(client: TestClient) -> None:
    task = _create_task(client)

    response = client.put(
        f"/api/v1/tasks/{task['id']}/subtasks/reorder",
        json={"sub_task_ids": [str(uuid.uuid4()) for _ in range(21)]},
    )
    assert response.status_code == 400
    assert "sub_task_ids: List should have at most 20 items" in response.json()["error"]


def test_reorder_subtasks_rejects_empty_ids_list(client: TestClient) -> None:
    task = _create_task(client)

    response = client.put(
        f"/api/v1/tasks/{task['id']}/subtasks/reorder",
        json={"sub_task_ids": []},
    )
    assert response.status_code == 400
    assert "sub_task_ids: List should have at least 1 item" in response.json()["error"]


def test_reorder_subtasks_operational_error_returns_503_with_retry_after(client: TestClient) -> None:
    task = _create_task(client)
    first = _create_subtask(client, str(task["id"]), title="First")
    second = _create_subtask(client, str(task["id"]), title="Second")

    with patch(
        "app.api.v1.subtasks.subtask_crud.reorder_subtasks",
        side_effect=OperationalError("SELECT 1", {}, Exception("db down")),
    ):
        response = client.put(
            f"/api/v1/tasks/{task['id']}/subtasks/reorder",
            json={"sub_task_ids": [first["id"], second["id"]]},
        )
    _assert_operational_error_response(response)


def test_delete_subtask_returns_204_and_removes_subtask(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]))
    before_update = _truncate_to_utc_second(str(task["updated_at"]))
    mocked_now = _next_updated_at_timestamp(task["updated_at"])

    with patch("app.crud.task.datetime") as mocked_datetime:
        mocked_datetime.now.return_value = mocked_now
        response = client.delete(f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}")
    assert response.status_code == 204

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    assert _truncate_to_utc_second(str(task_response.json()["updated_at"])) != before_update
    assert task_response.json()["sub_tasks"] == []


def test_delete_only_subtask_from_task(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]), title="Only child")

    delete_response = client.delete(f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}")
    assert delete_response.status_code == 204

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    assert task_response.json()["sub_tasks"] == []

    recreated = _create_subtask(client, str(task["id"]), title="Recreated")
    assert recreated["position"] == 0


def test_delete_subtask_missing_task_returns_404(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]))

    response = client.delete(f"/api/v1/tasks/{uuid.uuid4()}/subtasks/{subtask['id']}")
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}


def test_delete_subtask_missing_subtask_returns_404(client: TestClient) -> None:
    task = _create_task(client)

    response = client.delete(f"/api/v1/tasks/{task['id']}/subtasks/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json() == {"error": "Sub-task not found"}


def test_delete_subtask_operational_error_returns_503_with_retry_after(client: TestClient) -> None:
    task = _create_task(client)
    subtask = _create_subtask(client, str(task["id"]))

    with patch(
        "app.api.v1.subtasks.subtask_crud.delete_subtask",
        side_effect=OperationalError("SELECT 1", {}, Exception("db down")),
    ):
        response = client.delete(f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}")
    _assert_operational_error_response(response)


@pytest.mark.parametrize(
    ("delete_index", "expected_order"),
    [
        (0, ["Middle", "Last"]),
        (1, ["First", "Last"]),
        (2, ["First", "Middle"]),
    ],
)
def test_delete_subtask_compacts_remaining_positions(
    client: TestClient,
    delete_index: int,
    expected_order: list[str],
) -> None:
    task = _create_task(client)
    first = _create_subtask(client, str(task["id"]), title="First")
    middle = _create_subtask(client, str(task["id"]), title="Middle")
    last = _create_subtask(client, str(task["id"]), title="Last")
    subtasks = [first, middle, last]

    delete_response = client.delete(f"/api/v1/tasks/{task['id']}/subtasks/{subtasks[delete_index]['id']}")
    assert delete_response.status_code == 204

    task_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert task_response.status_code == 200
    remaining_subtasks = task_response.json()["sub_tasks"]
    assert [item["title"] for item in remaining_subtasks] == expected_order
    assert [item["position"] for item in remaining_subtasks] == [0, 1]

    created_after_delete = _create_subtask(client, str(task["id"]), title="After delete")
    assert created_after_delete["position"] == 2


def test_subtask_endpoints_validate_task_and_subtask_pairing(client: TestClient) -> None:
    task_one = _create_task(client, title="Task one")
    task_two = _create_task(client, title="Task two")
    subtask = _create_subtask(client, str(task_one["id"]))
    task_two_subtask = _create_subtask(client, str(task_two["id"]), title="Task two subtask")

    toggle_response = client.patch(f"/api/v1/tasks/{task_two['id']}/subtasks/{subtask['id']}/toggle")
    assert toggle_response.status_code == 404
    assert toggle_response.json() == {"error": "Sub-task not found"}

    update_response = client.patch(
        f"/api/v1/tasks/{task_two['id']}/subtasks/{subtask['id']}",
        json={"title": "New title"},
    )
    assert update_response.status_code == 404
    assert update_response.json() == {"error": "Sub-task not found"}

    delete_response = client.delete(f"/api/v1/tasks/{task_two['id']}/subtasks/{subtask['id']}")
    assert delete_response.status_code == 404
    assert delete_response.json() == {"error": "Sub-task not found"}

    reorder_response = client.put(
        f"/api/v1/tasks/{task_two['id']}/subtasks/reorder",
        json={"sub_task_ids": [subtask["id"], task_two_subtask["id"]]},
    )
    assert reorder_response.status_code == 400
    assert reorder_response.json() == {"error": "sub_task_ids: must include each existing sub-task exactly once"}


def test_delete_task_cascades_to_subtasks(client: TestClient, testing_session_factory: sessionmaker) -> None:
    task = _create_task(client)
    first = _create_subtask(client, str(task["id"]), title="First")
    second = _create_subtask(client, str(task["id"]), title="Second")

    delete_response = client.delete(f"/api/v1/tasks/{task['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert get_response.status_code == 404

    db = testing_session_factory()
    try:
        remaining_subtasks = list(
            db.scalars(
                select(SubTask).where(
                    SubTask.id.in_(
                        [
                            uuid.UUID(str(first["id"])),
                            uuid.UUID(str(second["id"])),
                        ]
                    )
                )
            )
        )
        assert remaining_subtasks == []
    finally:
        db.close()


def test_update_task_response_includes_sub_tasks(client: TestClient) -> None:
    task = _create_task(client, title="Parent task")
    subtask = _create_subtask(client, str(task["id"]), title="Nested item")

    response = client.patch(f"/api/v1/tasks/{task['id']}", json={"title": "Parent task updated"})
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Parent task updated"

    sub_tasks = body["sub_tasks"]
    assert len(sub_tasks) == 1
    returned_subtask = sub_tasks[0]
    assert returned_subtask["id"] == subtask["id"]
    assert returned_subtask["task_id"] == task["id"]
    assert returned_subtask["title"] == "Nested item"
    assert returned_subtask["completed"] is False
    assert returned_subtask["position"] == 0
    assert returned_subtask["created_at"] == subtask["created_at"]
