import pytest
from httpx import AsyncClient
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_student_registration_success(client: AsyncClient, seed_data):
    """Students can register with university email and index number."""
    response = await client.post(
        "/api/v1/auth/register/student",
        json={
            "email": "samitha.desilva@eng.sjp.ac.lk",
            "registration_number": "EG/2021/4501",
            "full_name": "Samitha De Silva",
            "department_id": str(seed_data["department"].id),
            "phone_number": "+94770001122",
            "password": "StrongPassword123!",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "token" in data
    assert data["token"] is not None


@pytest.mark.asyncio
async def test_student_registration_invalid_email_domain(client: AsyncClient, seed_data):
    """Non-university email domains are strictly rejected."""
    response = await client.post(
        "/api/v1/auth/register/student",
        json={
            "email": "intruder@gmail.com",
            "registration_number": "EG/2021/4502",
            "full_name": "External User",
            "password": "StrongPassword123!",
        },
    )
    assert response.status_code == 422
    assert "Registration is restricted to university emails" in response.text


@pytest.mark.asyncio
async def test_student_registration_invalid_reg_number(client: AsyncClient, seed_data):
    """Invalid student index formats are rejected."""
    response = await client.post(
        "/api/v1/auth/register/student",
        json={
            "email": "kasun@eng.sjp.ac.lk",
            "registration_number": "INVALID-1234",
            "full_name": "Kasun Perera",
            "password": "StrongPassword123!",
        },
    )
    assert response.status_code == 422
    assert "Registration number format must be like 'EG/2021/4500'" in response.text


@pytest.mark.asyncio
async def test_student_registration_duplicate_email(client: AsyncClient, seed_data):
    """Duplicate email registration is prevented with 409 Conflict."""
    response = await client.post(
        "/api/v1/auth/register/student",
        json={
            "email": seed_data["student"].email,
            "registration_number": "EG/2021/9999",
            "full_name": "Duplicate User",
            "password": "StrongPassword123!",
        },
    )
    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "RESOURCE_CONFLICT"


@pytest.mark.asyncio
async def test_student_registration_duplicate_reg_number(client: AsyncClient, seed_data):
    """Duplicate registration number is prevented with 409 Conflict."""
    response = await client.post(
        "/api/v1/auth/register/student",
        json={
            "email": "another.student@eng.sjp.ac.lk",
            "registration_number": seed_data["student"].registration_number,
            "full_name": "Duplicate Reg Number",
            "password": "StrongPassword123!",
        },
    )
    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "RESOURCE_CONFLICT"


@pytest.mark.asyncio
async def test_email_verification_flow(client: AsyncClient, seed_data):
    """Student cannot log in before verifying email; verifying email activates account."""
    # 1. Register student
    reg_res = await client.post(
        "/api/v1/auth/register/student",
        json={
            "email": "unverified.student@eng.sjp.ac.lk",
            "registration_number": "EG/2021/4505",
            "full_name": "Unverified Student",
            "password": "Password123!",
        },
    )
    verify_token = reg_res.json()["token"]

    # 2. Attempt login before verification -> 401 Unauthorized
    login_attempt = await client.post(
        "/api/v1/auth/login",
        json={"email": "unverified.student@eng.sjp.ac.lk", "password": "Password123!"},
    )
    assert login_attempt.status_code == 401
    assert "email address has not been verified" in login_attempt.text

    # 3. Verify email with verification token
    verify_res = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": verify_token},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True

    # 4. Attempt login after verification -> 200 OK
    login_success = await client.post(
        "/api/v1/auth/login",
        json={"email": "unverified.student@eng.sjp.ac.lk", "password": "Password123!"},
    )
    assert login_success.status_code == 200
    tokens = login_success.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["user"]["is_verified"] is True


@pytest.mark.asyncio
async def test_resend_verification_flow(client: AsyncClient, seed_data):
    """Students can request a new verification token."""
    # 1. Register student
    reg_res = await client.post(
        "/api/v1/auth/register/student",
        json={
            "email": "resend.test@eng.sjp.ac.lk",
            "registration_number": "EG/2021/4509",
            "full_name": "Resend Test",
            "password": "Password123!",
        },
    )
    assert reg_res.status_code == 201

    # 2. Resend verification token
    resend_res = await client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "resend.test@eng.sjp.ac.lk"},
    )
    assert resend_res.status_code == 200
    assert resend_res.json()["token"] is not None

    # 3. Verify with the new token
    verify_res = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": resend_res.json()["token"]},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True


@pytest.mark.asyncio
async def test_lecturer_approval_workflow(client: AsyncClient, seed_data):
    """Lecturer accounts must be verified by Super Admin before login."""
    # 1. Lecturer registers
    reg_res = await client.post(
        "/api/v1/auth/register/lecturer",
        json={
            "email": "new.lecturer@eng.sjp.ac.lk",
            "full_name": "Dr. Sunil Jayawardena",
            "department_id": str(seed_data["department"].id),
            "password": "Password123!",
        },
    )
    assert reg_res.status_code == 201

    # 2. Lecturer tries to log in -> blocked pending Super Admin approval
    login_blocked = await client.post(
        "/api/v1/auth/login",
        json={"email": "new.lecturer@eng.sjp.ac.lk", "password": "Password123!"},
    )
    assert login_blocked.status_code == 401
    assert "pending administrative verification" in login_blocked.text

    # 3. Super Admin logs in
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["admin"].email, "password": "Admin@USJ2026!"},
    )
    admin_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 4. Super Admin lists users and finds new lecturer
    users_list = await client.get("/api/v1/admin/users?role=LECTURER", headers=headers)
    new_lec = next(u for u in users_list.json() if u["email"] == "new.lecturer@eng.sjp.ac.lk")
    assert new_lec["is_verified"] is False

    # 5. Super Admin verifies lecturer
    verify_res = await client.patch(
        f"/api/v1/auth/admin/users/{new_lec['id']}/verify-lecturer",
        headers=headers,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["is_verified"] is True

    # 6. Lecturer can now log in successfully
    lec_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "new.lecturer@eng.sjp.ac.lk", "password": "Password123!"},
    )
    assert lec_login.status_code == 200
    assert lec_login.json()["user"]["role"] == "LECTURER"


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    """Protected endpoints reject requests without token or with invalid tokens."""
    # 1. Missing Authorization header
    res_missing = await client.get("/api/v1/auth/me")
    assert res_missing.status_code == 401
    assert res_missing.json()["error"]["code"] == "UNAUTHORIZED"

    # 2. Invalid / forged token
    res_invalid = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.forgedtoken"},
    )
    assert res_invalid.status_code == 401
    assert res_invalid.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_role_based_permissions(client: AsyncClient, seed_data):
    """Students cannot access administrative endpoints (403 Forbidden)."""
    # 1. Student logs in
    stu_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["student"].email, "password": "Student@USJ2026!"},
    )
    stu_token = stu_login.json()["access_token"]

    # 2. Student tries to call Super Admin user creation endpoint -> 403 Forbidden
    res_forbidden = await client.post(
        "/api/v1/auth/admin/create-user",
        headers={"Authorization": f"Bearer {stu_token}"},
        json={
            "email": "fake.admin@eng.sjp.ac.lk",
            "full_name": "Fake Admin",
            "role": "SUPER_ADMIN",
            "password": "Password123!",
        },
    )
    assert res_forbidden.status_code == 403
    assert res_forbidden.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_super_admin_provisions_facility_and_lab_admins(client: AsyncClient, seed_data):
    """Only Super Admin can provision FACILITY_ADMIN and LAB_ADMIN accounts."""
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["admin"].email, "password": "Admin@USJ2026!"},
    )
    admin_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Provision Facility Admin
    res_fac = await client.post(
        "/api/v1/auth/admin/create-user",
        headers=headers,
        json={
            "email": "hall.manager@eng.sjp.ac.lk",
            "full_name": "Hall Custodian",
            "role": "FACILITY_ADMIN",
            "password": "AdminPassword123!",
            "is_verified": True,
        },
    )
    assert res_fac.status_code == 201
    assert res_fac.json()["role"] == "FACILITY_ADMIN"

    # 2. Provision Lab Admin
    res_lab = await client.post(
        "/api/v1/auth/admin/create-user",
        headers=headers,
        json={
            "email": "lab.tech@eng.sjp.ac.lk",
            "full_name": "Senior Lab Technician",
            "role": "LAB_ADMIN",
            "password": "AdminPassword123!",
            "is_verified": True,
        },
    )
    assert res_lab.status_code == 201
    assert res_lab.json()["role"] == "LAB_ADMIN"


@pytest.mark.asyncio
async def test_refresh_token_rotation_and_revocation(client: AsyncClient, seed_data):
    """Rotating refresh token gives a new token pair and revokes the old one."""
    # 1. Log in
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["student"].email, "password": "Student@USJ2026!"},
    )
    initial_refresh = login_res.json()["refresh_token"]

    # 2. Rotate refresh token
    rotate_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert rotate_res.status_code == 200
    new_tokens = rotate_res.json()
    new_refresh = new_tokens["refresh_token"]
    assert new_refresh != initial_refresh

    # 3. Trying to reuse old refresh token must be rejected (Token Revocation)
    reuse_attempt = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert reuse_attempt.status_code == 401
    assert "revoked" in reuse_attempt.text

    # 4. Logout revokes active refresh token
    logout_res = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": new_refresh},
    )
    assert logout_res.status_code == 200

    # 5. Using logged out refresh token fails
    after_logout = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": new_refresh},
    )
    assert after_logout.status_code == 401


@pytest.mark.asyncio
async def test_password_reset_flow(client: AsyncClient, seed_data):
    """Complete password recovery lifecycle."""
    # 1. Request password reset
    forgot_res = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": seed_data["student"].email},
    )
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json()["token"]
    assert reset_token is not None

    # 2. Reset password
    reset_res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": "NewStudentPassword2026!"},
    )
    assert reset_res.status_code == 200

    # 3. Old password fails
    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["student"].email, "password": "Student@USJ2026!"},
    )
    assert old_login.status_code == 401

    # 4. New password succeeds
    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["student"].email, "password": "NewStudentPassword2026!"},
    )
    assert new_login.status_code == 200
