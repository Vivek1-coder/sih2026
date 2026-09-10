"""Public error contracts. Keep stable codes separate from diagnostic prose."""
import json
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

CODES = json.loads((Path(__file__).resolve().parents[1] / 'data/message_codes.json').read_text(encoding='utf-8'))

def install_message_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        code = CODES.get(str(exc.detail), {401: 'unauthorized', 403: 'forbidden', 404: 'notFound', 409: 'conflict', 422: 'validation'}.get(exc.status_code, 'requestFailed'))
        return JSONResponse(status_code=exc.status_code, content={'code': code, 'detail': code}, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={'code': 'validation', 'detail': [
            {'code': error['type'], 'field': '.'.join(str(part) for part in error['loc'][1:])}
            for error in exc.errors()
        ]})
