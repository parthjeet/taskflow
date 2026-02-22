from __future__ import annotations

from datetime import datetime, timezone
import time
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 — registers all models with Base.metadata
from app.api.deps import get_db
from app.db.base import Base
from app.main import create_app
from app.models.task import Task


def _normalize_utc_second(value: str) -> str:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.replace(microsecond=0).isoformat()


def _build_test_client() -> TestClient:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    @event.listens_for(engine, "connect")
    def _register_sqlite_functions(dbapi_connection, _connection_record) -> None:  # noqa: ANN001
        dbapi_connection.create_function("gen_random_uuid", 0, lambda: uuid.uuid4().hex)

    testing_session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    app = create_app()

    def override_get_db():  # noqa: ANN202
        db = testing_session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.state.testing_engine = engine
    return TestClient(app)


def _create_member(client: TestClient, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {"name": "Alice Chen", "email": "alice@example.com", "active": True}
    payload.update(overrides)
    response = client.post("/api/v1/members", json=payload)
    assert response.status_code == 201
    return response.json()


def _create_task(client: TestClient, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {"title": "Test task", "status": "To Do", "priority": "Medium"}
    payload.update(overrides)
    response = client.post("/api/v1/tasks", json=payload)
    assert response.status_code == 201
    return response.json()


# ─────────────────────── POST /tasks ───────────────────────

def test_create_task_valid_minimal() -> None:
    client = _build_test_client()
    response = client.post("/api/v1/tasks", json={"title": "My task", "status": "To Do", "priority": "High"})
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "My task"
    assert body["status"] == "To Do"
    assert body["priority"] == "High"
    assert "id" in body
    assert "created_at" in body
    assert "updated_at" in body
    assert body["assignee_id"] is None
    assert body["assignee_name"] is None
    assert body["blocking_reason"] == ""


def test_create_task_valid_full() -> None:
    client = _build_test_client()
    member = _create_member(client, name="Bob Smith", email="bob@example.com")
    response = client.post(
        "/api/v1/tasks",
        json={
            "title": "Full task",
            "status": "In Progress",
            "priority": "High",
            "description": "A detailed description",
            "assignee_id": member["id"],
            "gear_id": "1234",
            "blocking_reason": "",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Full task"
    assert body["description"] == "A detailed description"
    assert body["assignee_id"] == member["id"]
    assert body["assignee_name"] == "Bob Smith"
    assert body["gear_id"] == "1234"


def test_create_task_returns_201_with_sub_tasks_and_daily_updates_empty() -> None:
    client = _build_test_client()
    body = _create_task(client)
    assert "sub_tasks" in body
    assert body["sub_tasks"] == []
    assert "daily_updates" in body
    assert body["daily_updates"] == []


def test_create_task_missing_title_returns_400() -> None:
    client = _build_test_client()
    response = client.post("/api/v1/tasks", json={"status": "To Do", "priority": "Medium"})
    assert response.status_code == 400


def test_create_task_title_too_long_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "x" * 201, "status": "To Do", "priority": "Medium"},
    )
    assert response.status_code == 400


def test_create_task_whitespace_only_title_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "   ", "status": "To Do", "priority": "Medium"},
    )
    assert response.status_code == 400
    assert "title: String should have at least 1 character" in response.json()["error"]


def test_create_task_invalid_status_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Task", "status": "Flying", "priority": "Medium"},
    )
    assert response.status_code == 400


def test_create_task_invalid_priority_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Task", "status": "To Do", "priority": "Critical"},
    )
    assert response.status_code == 400


def test_create_task_invalid_gear_id_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Task", "status": "To Do", "priority": "Medium", "gear_id": "abc"},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "GEAR ID must be exactly 4 digits"}


def test_create_task_gear_id_too_short_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Task", "status": "To Do", "priority": "Medium", "gear_id": "123"},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "GEAR ID must be exactly 4 digits"}


def test_create_task_gear_id_too_long_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Task", "status": "To Do", "priority": "Medium", "gear_id": "12345"},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "GEAR ID must be exactly 4 digits"}


def test_create_task_blocked_without_reason_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Task", "status": "Blocked", "priority": "High", "blocking_reason": ""},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "Blocking reason is required when status is Blocked"}


def test_create_task_blocked_with_whitespace_only_reason_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Task", "status": "Blocked", "priority": "High", "blocking_reason": "   "},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "Blocking reason is required when status is Blocked"}


def test_create_task_blocked_missing_reason_field_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Task", "status": "Blocked", "priority": "High"},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "Blocking reason is required when status is Blocked"}


def test_create_task_blocked_with_reason_succeeds() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={
            "title": "Blocked task",
            "status": "Blocked",
            "priority": "High",
            "blocking_reason": "Waiting for approval",
        },
    )
    assert response.status_code == 201
    assert response.json()["blocking_reason"] == "Waiting for approval"
    assert response.json()["status"] == "Blocked"


def test_create_task_non_blocked_with_reason_is_cleared() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={
            "title": "Normal task",
            "status": "To Do",
            "priority": "Medium",
            "blocking_reason": "Should be cleared",
        },
    )
    assert response.status_code == 201
    assert response.json()["blocking_reason"] == ""


def test_create_task_with_nonexistent_assignee_returns_400() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Task", "status": "To Do", "priority": "Medium", "assignee_id": str(uuid.uuid4())},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "Assignee not found"}


def test_create_task_resolves_assignee_name() -> None:
    client = _build_test_client()
    member = _create_member(client, name="Bob Smith", email="bob@example.com")
    body = _create_task(client, assignee_id=member["id"])
    assert body["assignee_name"] == "Bob Smith"
    assert body["assignee_id"] == member["id"]


# ─────────────────────── GET /tasks (list) ───────────────────────

def test_list_tasks_empty() -> None:
    client = _build_test_client()
    response = client.get("/api/v1/tasks")
    assert response.status_code == 200
    assert response.json() == []


def test_list_tasks_returns_all() -> None:
    client = _build_test_client()
    _create_task(client, title="Task A")
    _create_task(client, title="Task B")
    _create_task(client, title="Task C")
    response = client.get("/api/v1/tasks")
    assert response.status_code == 200
    assert len(response.json()) == 3


def test_list_tasks_each_item_embeds_sub_tasks_and_daily_updates() -> None:
    client = _build_test_client()
    _create_task(client)
    body = client.get("/api/v1/tasks").json()
    assert "sub_tasks" in body[0]
    assert "daily_updates" in body[0]


def test_list_tasks_filter_by_status() -> None:
    client = _build_test_client()
    _create_task(client, title="Todo task", status="To Do")
    _create_task(client, title="Done task", status="Done")
    _create_task(client, title="In Progress task", status="In Progress")
    response = client.get("/api/v1/tasks?status=To Do")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "To Do"
    assert body[0]["title"] == "Todo task"


def test_list_tasks_filter_by_priority() -> None:
    client = _build_test_client()
    _create_task(client, title="High task", priority="High")
    _create_task(client, title="Low task", priority="Low")
    _create_task(client, title="Medium task", priority="Medium")
    response = client.get("/api/v1/tasks?priority=High")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["priority"] == "High"


def test_list_tasks_filter_by_assignee_uuid() -> None:
    client = _build_test_client()
    member = _create_member(client)
    _create_task(client, title="Assigned", assignee_id=member["id"])
    _create_task(client, title="Unassigned")
    response = client.get(f"/api/v1/tasks?assignee={member['id']}")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["assignee_id"] == member["id"]


def test_list_tasks_filter_by_unassigned() -> None:
    client = _build_test_client()
    member = _create_member(client)
    _create_task(client, title="Assigned", assignee_id=member["id"])
    _create_task(client, title="Unassigned A")
    _create_task(client, title="Unassigned B")
    response = client.get("/api/v1/tasks?assignee=unassigned")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    for task in body:
        assert task["assignee_id"] is None


def test_list_tasks_search_by_title() -> None:
    client = _build_test_client()
    _create_task(client, title="Deploy application to staging")
    _create_task(client, title="Fix login bug")
    response = client.get("/api/v1/tasks?search=deploy")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert "Deploy" in body[0]["title"]


def test_list_tasks_search_by_description() -> None:
    client = _build_test_client()
    _create_task(client, title="Task A", description="Need dependency upgrade before release")
    _create_task(client, title="Task B", description="No blocking issue here")
    response = client.get("/api/v1/tasks?search=dependency")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "Task A"


def test_list_tasks_search_by_gear_id() -> None:
    client = _build_test_client()
    _create_task(client, title="Task with GEAR", gear_id="9999")
    _create_task(client, title="Task without GEAR")
    response = client.get("/api/v1/tasks?search=9999")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["gear_id"] == "9999"


def test_list_tasks_search_escapes_like_wildcards() -> None:
    client = _build_test_client()
    percent_task = _create_task(client, title="Percent 100% complete")
    underscore_task = _create_task(client, title="Task_name_with_underscore")
    _create_task(client, title="Regular task")

    percent_response = client.get("/api/v1/tasks?search=%25")
    assert percent_response.status_code == 200
    percent_ids = {task["id"] for task in percent_response.json()}
    assert percent_ids == {percent_task["id"]}

    underscore_response = client.get("/api/v1/tasks?search=_")
    assert underscore_response.status_code == 200
    underscore_ids = {task["id"] for task in underscore_response.json()}
    assert underscore_ids == {underscore_task["id"]}


def test_list_tasks_whitespace_only_search_returns_all_tasks() -> None:
    client = _build_test_client()
    first = _create_task(client, title="Task A")
    second = _create_task(client, title="Task B")
    response = client.get("/api/v1/tasks?search=   ")
    assert response.status_code == 200
    returned_ids = {task["id"] for task in response.json()}
    assert returned_ids == {first["id"], second["id"]}


def test_list_tasks_sort_by_priority() -> None:
    client = _build_test_client()
    _create_task(client, title="Low task", priority="Low")
    _create_task(client, title="High task", priority="High")
    _create_task(client, title="Medium task", priority="Medium")
    response = client.get("/api/v1/tasks?sort=priority")
    assert response.status_code == 200
    body = response.json()
    priorities = [t["priority"] for t in body]
    assert priorities == ["High", "Medium", "Low"]


def test_list_tasks_sort_by_status() -> None:
    client = _build_test_client()
    _create_task(client, title="Done task", status="Done")
    _create_task(client, title="In Progress task", status="In Progress")
    _create_task(client, title="Todo task", status="To Do")
    _create_task(client, title="Blocked task", status="Blocked", blocking_reason="Some reason")
    response = client.get("/api/v1/tasks?sort=status")
    assert response.status_code == 200
    body = response.json()
    statuses = [t["status"] for t in body]
    assert statuses == ["To Do", "In Progress", "Blocked", "Done"]


def test_list_tasks_default_sort_is_updated_at_descending() -> None:
    client = _build_test_client()
    first = _create_task(client, title="First")
    second = _create_task(client, title="Second")
    time.sleep(0.01)
    patch_response = client.patch(f"/api/v1/tasks/{first['id']}", json={"title": "First updated"})
    assert patch_response.status_code == 200

    response = client.get("/api/v1/tasks")
    assert response.status_code == 200
    body = response.json()
    assert [body[0]["id"], body[1]["id"]] == [first["id"], second["id"]]


def test_list_tasks_invalid_assignee_format_returns_400() -> None:
    client = _build_test_client()
    response = client.get("/api/v1/tasks?assignee=not-a-valid-uuid")
    assert response.status_code == 400
    assert response.json() == {"error": "Assignee filter must be a UUID or 'unassigned'"}


def test_list_tasks_invalid_status_filter_returns_400() -> None:
    client = _build_test_client()
    response = client.get("/api/v1/tasks?status=InvalidValue")
    assert response.status_code == 400


def test_list_tasks_invalid_priority_filter_returns_400() -> None:
    client = _build_test_client()
    response = client.get("/api/v1/tasks?priority=Urgent")
    assert response.status_code == 400


# ─────────────────────── GET /tasks/{id} ───────────────────────

def test_get_task_exists() -> None:
    client = _build_test_client()
    created = _create_task(client, title="Find me")
    response = client.get(f"/api/v1/tasks/{created['id']}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["title"] == "Find me"
    assert "sub_tasks" in body
    assert "daily_updates" in body


def test_get_task_not_found_returns_404() -> None:
    client = _build_test_client()
    response = client.get(f"/api/v1/tasks/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}


# ─────────────────────── PATCH /tasks/{id} ───────────────────────

def test_update_task_partial_update() -> None:
    client = _build_test_client()
    created = _create_task(client, title="Original title", priority="High")
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"title": "Updated title"})
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Updated title"
    assert body["status"] == created["status"]
    assert body["priority"] == "High"


def test_update_task_whitespace_only_title_returns_400() -> None:
    client = _build_test_client()
    created = _create_task(client, title="Original title")
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"title": "   "})
    assert response.status_code == 400
    assert "title: String should have at least 1 character" in response.json()["error"]


def test_update_task_explicit_null_title_returns_clean_400_message() -> None:
    client = _build_test_client()
    created = _create_task(client, title="Original title")
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"title": None})
    assert response.status_code == 400
    assert response.json()["error"] == "title: field cannot be null"


def test_update_task_explicit_null_status_returns_400() -> None:
    client = _build_test_client()
    created = _create_task(client)
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"status": None})
    assert response.status_code == 400
    assert response.json()["error"] == "status: field cannot be null"


def test_update_task_explicit_null_priority_returns_400() -> None:
    client = _build_test_client()
    created = _create_task(client)
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"priority": None})
    assert response.status_code == 400
    assert response.json()["error"] == "priority: field cannot be null"


def test_update_task_invalid_gear_id_returns_400() -> None:
    client = _build_test_client()
    created = _create_task(client)
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"gear_id": "invalid"})
    assert response.status_code == 400
    assert response.json() == {"error": "GEAR ID must be exactly 4 digits"}


def test_update_task_refreshes_updated_at() -> None:
    client = _build_test_client()
    created = _create_task(client)
    before_update = _normalize_utc_second(str(created["updated_at"]))
    time.sleep(1.1)
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"title": "New title"})
    assert response.status_code == 200
    after_update = _normalize_utc_second(str(response.json()["updated_at"]))
    assert after_update != before_update


def test_update_task_noop_status_patch_keeps_updated_at() -> None:
    client = _build_test_client()
    created = _create_task(client, status="Blocked", blocking_reason="Waiting")

    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"status": "Blocked"})
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "Blocked"
    assert body["blocking_reason"] == "Waiting"
    assert _normalize_utc_second(str(body["updated_at"])) == _normalize_utc_second(str(created["updated_at"]))


def test_update_task_empty_payload_keeps_task_unchanged() -> None:
    client = _build_test_client()
    created = _create_task(
        client,
        title="Original title",
        description="Original description",
        status="To Do",
        priority="High",
    )

    response = client.patch(f"/api/v1/tasks/{created['id']}", json={})
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == created["title"]
    assert body["description"] == created["description"]
    assert body["status"] == created["status"]
    assert body["priority"] == created["priority"]
    assert body["updated_at"] == created["updated_at"]


def test_update_task_blocking_reason_auto_cleared_on_unblock() -> None:
    client = _build_test_client()
    created = _create_task(client, status="Blocked", blocking_reason="Waiting on infra team")
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"status": "In Progress"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "In Progress"
    assert body["blocking_reason"] == ""


def test_update_task_blocking_reason_ignored_when_status_is_not_blocked() -> None:
    client = _build_test_client()
    created = _create_task(client, status="To Do")
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"blocking_reason": "Should not persist"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "To Do"
    assert body["blocking_reason"] == ""


def test_update_task_blocking_reason_updated_while_still_blocked() -> None:
    client = _build_test_client()
    created = _create_task(client, status="Blocked", blocking_reason="Old reason")
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"blocking_reason": "Updated reason"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "Blocked"
    assert body["blocking_reason"] == "Updated reason"


def test_update_task_clearing_blocking_reason_on_blocked_task_returns_400() -> None:
    client = _build_test_client()
    created = _create_task(client, status="Blocked", blocking_reason="Waiting on API fix")

    for blocking_reason in ("", "   "):
        response = client.patch(f"/api/v1/tasks/{created['id']}", json={"blocking_reason": blocking_reason})
        assert response.status_code == 400
        assert response.json() == {"error": "Blocking reason is required when status is Blocked"}


def test_update_task_null_blocking_reason_on_blocked_task_returns_400() -> None:
    client = _build_test_client()
    created = _create_task(client, status="Blocked", blocking_reason="Waiting on API fix")
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"blocking_reason": None})
    assert response.status_code == 400
    assert response.json() == {"error": "Blocking reason is required when status is Blocked"}


def test_update_task_blocked_title_patch_preserves_existing_blocking_reason() -> None:
    client = _build_test_client()
    testing_session_factory = sessionmaker(bind=client.app.state.testing_engine, autocommit=False, autoflush=False)
    db = testing_session_factory()
    try:
        # Intentionally inserts a DB-only legacy value (with preserved spacing) to verify
        # title-only PATCH does not normalize existing blocking_reason content.
        task = Task(
            title="Blocked task",
            description=None,
            status="Blocked",
            priority="High",
            blocking_reason="  Keep spacing  ",
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        task_id = task.id
    finally:
        db.close()

    response = client.patch(f"/api/v1/tasks/{task_id}", json={"title": "Updated blocked task"})
    assert response.status_code == 200
    assert response.json()["blocking_reason"] == "  Keep spacing  "


def test_update_task_assignee_re_resolved_on_reassign() -> None:
    client = _build_test_client()
    alice = _create_member(client, name="Alice Chen", email="alice@example.com")
    bob = _create_member(client, name="Bob Martinez", email="bob@example.com")
    created = _create_task(client, assignee_id=alice["id"])
    assert created["assignee_name"] == "Alice Chen"

    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"assignee_id": bob["id"]})
    assert response.status_code == 200
    body = response.json()
    assert body["assignee_id"] == bob["id"]
    assert body["assignee_name"] == "Bob Martinez"


def test_update_task_assignee_cleared_to_null() -> None:
    client = _build_test_client()
    member = _create_member(client)
    created = _create_task(client, assignee_id=member["id"])

    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"assignee_id": None})
    assert response.status_code == 200
    body = response.json()
    assert body["assignee_id"] is None
    assert body["assignee_name"] is None


def test_update_task_nonexistent_assignee_returns_400() -> None:
    client = _build_test_client()
    created = _create_task(client)
    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"assignee_id": str(uuid.uuid4())})
    assert response.status_code == 400
    assert response.json() == {"error": "Assignee not found"}


def test_update_task_clear_description_to_null() -> None:
    client = _build_test_client()
    created = _create_task(client, description="Has description")

    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"description": None})
    assert response.status_code == 200
    assert response.json()["description"] is None


def test_update_task_clear_gear_id_to_null() -> None:
    client = _build_test_client()
    created = _create_task(client, gear_id="1234")

    response = client.patch(f"/api/v1/tasks/{created['id']}", json={"gear_id": None})
    assert response.status_code == 200
    assert response.json()["gear_id"] is None


def test_update_task_not_found_returns_404() -> None:
    client = _build_test_client()
    response = client.patch(f"/api/v1/tasks/{uuid.uuid4()}", json={"title": "Ghost"})
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}


# ─────────────────────── DELETE /tasks/{id} ───────────────────────

def test_delete_task_returns_204() -> None:
    client = _build_test_client()
    created = _create_task(client)
    response = client.delete(f"/api/v1/tasks/{created['id']}")
    assert response.status_code == 204
    get_response = client.get(f"/api/v1/tasks/{created['id']}")
    assert get_response.status_code == 404


def test_delete_task_removes_from_list() -> None:
    client = _build_test_client()
    created = _create_task(client)
    client.delete(f"/api/v1/tasks/{created['id']}")
    list_response = client.get("/api/v1/tasks")
    assert list_response.status_code == 200
    assert all(t["id"] != created["id"] for t in list_response.json())


def test_delete_task_not_found_returns_404() -> None:
    client = _build_test_client()
    response = client.delete(f"/api/v1/tasks/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json() == {"error": "Task not found"}
