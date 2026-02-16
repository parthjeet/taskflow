from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.api.v1.health import router as health_router
from app.core.config import settings
from app.core.exceptions import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)



def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_title)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost"],
        allow_origin_regex=r"^http://localhost(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # Root-level health endpoint for Electron startup polling.
    app.include_router(health_router)
    app.include_router(api_router, prefix=settings.api_prefix)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
