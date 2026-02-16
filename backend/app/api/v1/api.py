from fastapi import APIRouter

from app.api.v1.members import router as members_router
from app.api.v1.settings import router as settings_router

api_router = APIRouter()

api_router.include_router(members_router, prefix="/members", tags=["members"])
api_router.include_router(settings_router, prefix="/settings", tags=["settings"])
