from __future__ import annotations

import multiprocessing

import uvicorn

from app.core.config import settings



def main() -> None:
    multiprocessing.freeze_support()
    uvicorn.run("app.main:app", host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
