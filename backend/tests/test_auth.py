import unittest

from fastapi import HTTPException, Response
from starlette.requests import Request

from app.api.dependencies import get_current_token_payload
from app.api.routes.auth import login, refresh_session
from app.core.config import settings
from app.core.security import (
    TokenValidationError,
    verify_access_token,
    verify_refresh_token,
)
from app.schemas.userSchema import LoginRequest, RefreshRequest


def make_request(
    *,
    authorization: str | None = None,
    cookie: str | None = None,
) -> Request:
    headers: list[tuple[bytes, bytes]] = []
    if authorization:
        headers.append((b"authorization", authorization.encode("utf-8")))
    if cookie:
        headers.append((b"cookie", cookie.encode("utf-8")))
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "headers": headers,
            "client": ("testclient", 50000),
            "server": ("testserver", 80),
        }
    )


class AuthTests(unittest.TestCase):
    def test_all_mock_login_methods_issue_valid_token_pairs(self) -> None:
        inputs = [
            LoginRequest(auth_method="abha_mock", identifier="demo@abdm"),
            LoginRequest(auth_method="aadhaar_mock", identifier="123456789012"),
            LoginRequest(auth_method="guest", full_name="Demo Guest"),
        ]

        for login_request in inputs:
            with self.subTest(auth_method=login_request.auth_method):
                response = Response()
                tokens = login(login_request, response)
                access = verify_access_token(tokens.access_token)
                refresh = verify_refresh_token(tokens.refresh_token)

                self.assertEqual(access["iss"], settings.JWT_ISSUER)
                self.assertEqual(access["aud"], settings.JWT_AUDIENCE)
                self.assertEqual(access["type"], "access")
                self.assertEqual(refresh["type"], "refresh")
                self.assertEqual(access["sub"], tokens.user.id)
                self.assertTrue(tokens.user.is_mock)

                cookies = " ".join(
                    value.decode("latin-1")
                    for name, value in response.raw_headers
                    if name == b"set-cookie"
                )
                self.assertEqual(cookies.count("HttpOnly"), 2)

    def test_access_token_cannot_be_used_as_refresh_token(self) -> None:
        tokens = login(LoginRequest(auth_method="guest"), Response())
        with self.assertRaises(TokenValidationError):
            verify_refresh_token(tokens.access_token)

    def test_bearer_access_token_authenticates_request(self) -> None:
        tokens = login(LoginRequest(auth_method="guest"), Response())
        request = make_request(authorization=f"Bearer {tokens.access_token}")
        payload = get_current_token_payload(request)
        self.assertEqual(payload["sub"], tokens.user.id)

    def test_refresh_tokens_are_rotated_and_single_use(self) -> None:
        tokens = login(LoginRequest(auth_method="guest"), Response())
        body = RefreshRequest(refresh_token=tokens.refresh_token)

        rotated = refresh_session(make_request(), Response(), body)
        self.assertNotEqual(rotated.refresh_token, tokens.refresh_token)

        with self.assertRaises(HTTPException) as raised:
            refresh_session(make_request(), Response(), body)
        self.assertEqual(raised.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
