from fastapi import APIRouter

from app.api.v1.members import router as members_router
from app.api.v1.settings import router as settings_router
from app.api.v1.subtasks import router as subtasks_router
from app.api.v1.tasks import router as tasks_router

api_router = APIRouter()

api_router.include_router(members_router, prefix="/members", tags=["members"])
api_router.include_router(settings_router, prefix="/settings", tags=["settings"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(subtasks_router, prefix="/tasks/{task_id}/subtasks", tags=["subtasks"])
