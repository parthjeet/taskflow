from __future__ import annotations

import uuid

import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 - Ensure SQLAlchemy metadata imports
from app.api.deps import get_db
from app.api.v1 import members as members_api
from app.db.base import Base
from app.main import create_app


def _create_member(client: TestClient, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "Alice Chen",
        "email": "alice@example.com",
        "active": True,
    }
    payload.update(overrides)
    response = client.post("/api/v1/members", json=payload)
    assert response.status_code == 201
    return response.json()


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

    def override_get_db():
        db = testing_session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.state.testing_engine = engine
    return TestClient(app)


def test_get_members_returns_empty_list() -> None:
    client = _build_test_client()
    response = client.get("/api/v1/members")

    assert response.status_code == 200
    assert response.json() == []


def test_get_member_by_id_returns_member() -> None:
    client = _build_test_client()
    member = _create_member(client)

    response = client.get(f"/api/v1/members/{member['id']}")

    assert response.status_code == 200
    assert response.json() == member


def test_get_member_by_id_returns_not_found_for_unknown_id() -> None:
    client = _build_test_client()
    unknown_id = uuid.uuid4()

    response = client.get(f"/api/v1/members/{unknown_id}")

    assert response.status_code == 404
    assert response.json() == {"error": "Member not found"}


def test_create_member_returns_created_member() -> None:
    client = _build_test_client()
    body = _create_member(client)

    assert "id" in body
    assert body["name"] == "Alice Chen"
    assert body["email"] == "alice@example.com"
    assert body["active"] is True


def test_create_member_with_invalid_email_returns_normalized_error() -> None:
    client = _build_test_client()
    response = client.post(
        "/api/v1/members",
        json={"name": "Alice", "email": "not-an-email", "active": True},
    )

    assert response.status_code == 400
    body = response.json()
    assert "error" in body
    assert isinstance(body["error"], str)
    assert "email" in body["error"]


def test_create_member_with_duplicate_email_returns_conflict() -> None:
    client = _build_test_client()
    _create_member(client, email="duplicate@example.com")

    response = client.post(
        "/api/v1/members",
        json={"name": "Alice Dup", "email": "duplicate@example.com", "active": True},
    )

    assert response.status_code == 409
    assert response.json() == {"error": "Member with this email already exists"}


def test_create_member_integrity_error_fallback_returns_conflict(monkeypatch) -> None:  # noqa: ANN001
    client = _build_test_client()

    monkeypatch.setattr(members_api.member_crud, "get_member_by_email", lambda _db, _email: None)

    def _raise_integrity_error(_db, _payload):
        raise IntegrityError("INSERT INTO members ...", {"email": "x@example.com"}, Exception("unique_violation"))

    monkeypatch.setattr(members_api.member_crud, "create_member", _raise_integrity_error)

    response = client.post(
        "/api/v1/members",
        json={"name": "Alice", "email": "x@example.com", "active": True},
    )

    assert response.status_code == 409
    assert response.json() == {"error": "Member with this email already exists"}


def test_patch_member_updates_only_provided_fields() -> None:
    client = _build_test_client()
    member = _create_member(client, name="Alice", email="alice@example.com")

    response = client.patch(f"/api/v1/members/{member['id']}", json={"name": "Alice Updated"})

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == member["id"]
    assert body["name"] == "Alice Updated"
    assert body["email"] == "alice@example.com"
    assert body["active"] is True


def test_patch_member_with_duplicate_email_returns_conflict() -> None:
    client = _build_test_client()
    first = _create_member(client, name="Alpha", email="alpha@example.com")
    second = _create_member(client, name="Beta", email="beta@example.com")

    response = client.patch(f"/api/v1/members/{second['id']}", json={"email": first["email"]})

    assert response.status_code == 409
    assert response.json() == {"error": "Member with this email already exists"}


def test_patch_member_integrity_error_fallback_returns_conflict(monkeypatch) -> None:  # noqa: ANN001
    client = _build_test_client()
    member = _create_member(client, name="Alice", email="alice@example.com")

    monkeypatch.setattr(members_api.member_crud, "get_member_by_email", lambda _db, _email: None)

    def _raise_integrity_error(_db, _member, _payload):
        raise IntegrityError("UPDATE members ...", {"email": "alice2@example.com"}, Exception("unique_violation"))

    monkeypatch.setattr(members_api.member_crud, "update_member", _raise_integrity_error)

    response = client.patch(
        f"/api/v1/members/{member['id']}",
        json={"email": "alice2@example.com"},
    )

    assert response.status_code == 409
    assert response.json() == {"error": "Member with this email already exists"}


def test_patch_member_returns_not_found_for_unknown_id() -> None:
    client = _build_test_client()
    unknown_id = uuid.uuid4()

    response = client.patch(f"/api/v1/members/{unknown_id}", json={"name": "Nobody"})

    assert response.status_code == 404
    assert response.json() == {"error": "Member not found"}


def test_patch_member_rejects_explicit_null_name() -> None:
    client = _build_test_client()
    member = _create_member(client)

    response = client.patch(f"/api/v1/members/{member['id']}", json={"name": None})

    assert response.status_code == 400
    body = response.json()
    assert "error" in body
    assert body["error"] == "name: field cannot be null"


def test_patch_member_rejects_explicit_null_email() -> None:
    client = _build_test_client()
    member = _create_member(client)

    response = client.patch(f"/api/v1/members/{member['id']}", json={"email": None})

    assert response.status_code == 400
    body = response.json()
    assert "error" in body
    assert body["error"] == "email: field cannot be null"


def test_delete_member_returns_no_content_and_removes_member_when_tasks_schema_is_missing() -> None:
    client = _build_test_client()
    member = _create_member(client)

    delete_response = client.delete(f"/api/v1/members/{member['id']}")
    list_response = client.get("/api/v1/members")

    assert delete_response.status_code == 204
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_delete_member_returns_not_found_for_unknown_id() -> None:
    client = _build_test_client()
    unknown_id = uuid.uuid4()

    response = client.delete(f"/api/v1/members/{unknown_id}")

    assert response.status_code == 404
    assert response.json() == {"error": "Member not found"}


def test_delete_member_with_assigned_tasks_returns_conflict() -> None:
    client = _build_test_client()
    member = _create_member(client, name="Bob", email="bob@example.com")

    engine = client.app.state.testing_engine
    tasks_table = sa.Table("tasks", sa.MetaData(), autoload_with=engine)
    with engine.begin() as connection:
        connection.execute(
            sa.insert(tasks_table).values(
                id=uuid.uuid4().hex,
                title="Assigned task",
                status="To Do",
                priority="Medium",
                assignee_id=uuid.UUID(str(member["id"])).hex,
                blocking_reason="",
            )
        )

    response = client.delete(f"/api/v1/members/{member['id']}")

    assert response.status_code == 409
    assert response.json() == {
        "error": "Cannot delete member with 1 assigned task(s). Reassign or complete them first."
    }


def test_delete_member_returns_no_content_when_tasks_table_lacks_assignee_column() -> None:
    client = _build_test_client()
    member = _create_member(client, name="No Column", email="nocolumn@example.com")

    engine = client.app.state.testing_engine
    metadata = sa.MetaData()
    with engine.begin() as connection:
        connection.execute(sa.text("DROP TABLE tasks"))

    tasks_table = sa.Table(
        "tasks",
        metadata,
        sa.Column("id", sa.String(length=36), primary_key=True),
    )
    metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(sa.insert(tasks_table).values(id=str(uuid.uuid4())))

    response = client.delete(f"/api/v1/members/{member['id']}")
    list_response = client.get("/api/v1/members")

    assert response.status_code == 204
    assert list_response.status_code == 200
    assert list_response.json() == []
