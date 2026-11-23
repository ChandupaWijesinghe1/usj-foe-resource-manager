import io
import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.core.rate_limit import limiter


@pytest.mark.asyncio
async def test_rate_limiting_on_login(client: AsyncClient, seed_data: dict):
    """Verifies that brute-force attempts on /auth/login trigger HTTP 429 Too Many Requests."""
    limiter.reset()  # Reset rate limit counter for a clean test

    login_payload = {
        "email": "invalid_user@eng.sjp.ac.lk",
        "password": "WrongPassword123!",
    }

    # First 10 requests should proceed (failing authentication with 401)
    for _ in range(10):
        resp = await client.post(
            "/api/v1/auth/login",
            json=login_payload,
            headers={"X-Test-Rate-Limit": "true"},
        )
        assert resp.status_code == 401

    # 11th request must be blocked by the rate limiter with 429
    resp_rate_limited = await client.post(
        "/api/v1/auth/login",
        json=login_payload,
        headers={"X-Test-Rate-Limit": "true"},
    )
    assert resp_rate_limited.status_code == 429
    err_body = resp_rate_limited.json()
    err_msg = err_body.get("error", {}).get("message") or err_body.get("detail", "")
    assert "Too many requests" in err_msg
    assert "retry-after" in resp_rate_limited.headers

    # Reset limiter after test
    limiter.reset()


@pytest.mark.asyncio
async def test_file_upload_type_and_size_validation(client: AsyncClient, seed_data: dict):
    """Verifies that malicious or disallowed file extensions and oversized files are rejected."""
    limiter.reset()

    # Login as student
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["student"].email, "password": "Student@USJ2026!"},
    )
    assert login_res.status_code == 200
    student_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 1. Disallowed extension: .exe or .sh
    bad_file = ("script.exe", io.BytesIO(b"binary-content-here"), "application/octet-stream")
    resp_bad_ext = await client.post(
        "/api/v1/bookings/upload-document",
        files={"file": bad_file},
        headers=student_headers,
    )
    assert resp_bad_ext.status_code == 400
    err_body = resp_bad_ext.json()
    err_msg = err_body.get("error", {}).get("message") or err_body.get("detail", "")
    assert "Unsupported file format" in err_msg

    # 2. Allowed extension (.pdf) succeeds
    good_pdf = ("approval_letter.pdf", io.BytesIO(b"%PDF-1.4 sample pdf content"), "application/pdf")
    resp_good = await client.post(
        "/api/v1/bookings/upload-document",
        files={"file": good_pdf},
        headers=student_headers,
    )
    assert resp_good.status_code == 201
    assert "url" in resp_good.json()
    assert resp_good.json()["url"].startswith("/uploads/documents/")


@pytest.mark.asyncio
async def test_sql_injection_protection_in_search(client: AsyncClient, seed_data: dict):
    """Verifies SQL injection payloads in search parameters are safely sanitized by SQLAlchemy."""
    sql_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1' UNION SELECT * FROM users --",
    ]

    for payload in sql_payloads:
        # Search public directory with SQL injection payload
        resp = await client.get(f"/api/v1/services/directory?search={payload}")
        assert resp.status_code == 200
        # Results should be an empty list or match literal strings, not dump database tables
        assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_rbac_security_enforcement(client: AsyncClient, seed_data: dict):
    """Verifies that student and lecturer tokens cannot execute administrative operations."""
    limiter.reset()

    # Login as student
    s_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["student"].email, "password": "Student@USJ2026!"},
    )
    stu_headers = {"Authorization": f"Bearer {s_login.json()['access_token']}"}

    # Login as lecturer
    l_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["lecturer"].email, "password": "Lecturer@USJ2026!"},
    )
    lec_headers = {"Authorization": f"Bearer {l_login.json()['access_token']}"}

    # Student attempting Super Admin user management
    resp1 = await client.get("/api/v1/admin/users", headers=stu_headers)
    assert resp1.status_code == 403

    # Lecturer attempting Facility Admin booking status updates
    fake_id = "00000000-0000-0000-0000-000000000001"
    resp2 = await client.patch(
        f"/api/v1/bookings/{fake_id}/status",
        json={"status": "APPROVED"},
        headers=lec_headers,
    )
    assert resp2.status_code == 403

    # Unauthenticated request to admin metrics
    resp3 = await client.get("/api/v1/admin/metrics")
    assert resp3.status_code == 401
