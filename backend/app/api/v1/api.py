from fastapi import APIRouter

from app.api.v1.members import router as members_router

api_router = APIRouter()

api_router.include_router(members_router, prefix="/members", tags=["members"])
