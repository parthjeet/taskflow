from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud import member as member_crud
from app.schemas.member import MemberCreate, MemberResponse, MemberUpdate

router = APIRouter()


@router.get("", response_model=list[MemberResponse])
def list_members(db: Session = Depends(get_db)) -> list[MemberResponse]:
    return member_crud.list_members(db)


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(member_id: uuid.UUID, db: Session = Depends(get_db)) -> MemberResponse:
    member = member_crud.get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return member


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def create_member(payload: MemberCreate, db: Session = Depends(get_db)) -> MemberResponse:
    existing_member = member_crud.get_member_by_email(db, payload.email)
    if existing_member:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Member with this email already exists")

    try:
        return member_crud.create_member(db, payload)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Member with this email already exists") from exc


@router.patch("/{member_id}", response_model=MemberResponse)
def update_member(
    member_id: uuid.UUID,
    payload: MemberUpdate,
    db: Session = Depends(get_db),
) -> MemberResponse:
    member = member_crud.get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if payload.email is not None:
        existing_member = member_crud.get_member_by_email(db, payload.email)
        if existing_member and existing_member.id != member.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Member with this email already exists")

    try:
        return member_crud.update_member(db, member, payload)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Member with this email already exists") from exc


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    member = member_crud.get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    assigned_tasks_count = member_crud.count_assigned_tasks(db, member_id)
    if assigned_tasks_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete member with {assigned_tasks_count} assigned task(s). Reassign or complete them first.",
        )

    authored_updates_count = member_crud.count_authored_daily_updates(db, member_id)
    if authored_updates_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot delete member with {authored_updates_count} authored daily update(s). "
                "Delete those updates first."
            ),
        )

    member_crud.delete_member(db, member)
