# API Specification & Technical Documentation

This document describes the versioned RESTful API (`/api/v1`) powering the **University of Sri Jayewardenepura Faculty of Engineering Resource Management System**.

---

## 1. API Architecture & Standards

- **Base URL**: `https://api.resources.eng.sjp.ac.lk/api/v1` (Production) / `http://localhost:8000/api/v1` (Local)
- **Protocol**: HTTPS / REST
- **Format**: JSON (`Content-Type: application/json; charset=utf-8`)
- **Authentication**: JWT Bearer Tokens (`Authorization: Bearer <access_token>`)
- **Interactive Documentation**:
  - Swagger UI: `/api/v1/docs`
  - ReDoc: `/api/v1/redoc`
  - OpenAPI Specification JSON: `/api/v1/openapi.json`
  - Liveness Health Probe: `/health`

---

## 2. Standardized Error Response Format

All application errors follow a unified contract handled by the centralized exception handler:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Time slot conflicts with an existing booking (Status: APPROVED).",
    "details": null
  }
}
```

### Common HTTP Status Codes:
| Code | Status | Description |
|---|---|---|
| `200` | OK | Successful operation |
| `201` | Created | Resource successfully created |
| `204` | No Content | Successful deletion/cancellation |
| `400` | Bad Request | Semantic validation failure or invalid payload |
| `401` | Unauthorized | Missing or expired JWT access token |
| `403` | Forbidden | Insufficient role permissions for requested action |
| `404` | Not Found | Target entity does not exist |
| `409` | Conflict | Booking clash, duplicate entry, or inventory exhaustion |
| `413` | Payload Too Large | File upload exceeds maximum allowable size (50MB) |
| `422` | Unprocessable Entity | Pydantic schema validation error |
| `429` | Too Many Requests | Rate limit exceeded on sensitive endpoint (`Retry-After` header included) |
| `500` | Server Error | Unhandled internal server exception |

---

## 3. Role-Based Access Control (RBAC) Permissions Matrix

| Endpoint Group | Student | Lecturer | Facility Admin | Lab Admin | Super Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| **Public Directory** (`/halls`, `/lecturers`, `/services`) | Read | Read | Read | Read | Read |
| **Hall Booking Submission** (`POST /bookings`) | Yes | Yes | Yes | Yes | Yes |
| **Hall Approval / Management** (`PATCH /bookings/{id}/status`) | - | - | **Yes** | - | **Yes** |
| **Consultation Slot Publishing** (`POST /lecturers/me/availability`) | - | **Yes** | - | - | **Yes** |
| **Consultation Booking** (`POST /meetings`) | **Yes** | - | - | - | **Yes** |
| **Consultation Response** (`PATCH /meetings/{id}/status`) | - | **Yes** | - | - | **Yes** |
| **Equipment Loan Request** (`POST /equipment/borrows`) | **Yes** | **Yes** | - | - | **Yes** |
| **Equipment Issuance / Return** (`PATCH /equipment/borrows/{id}/status`) | - | - | - | **Yes** | **Yes** |
| **3D Print Job Submission** (`POST /services/requests/3d-print`) | **Yes** | **Yes** | - | - | **Yes** |
| **Service Status & Cost Estimation** (`PATCH /services/requests/{id}/status`) | - | - | - | **Yes** | **Yes** |
| **Admin Metrics & Reports** (`GET /admin/metrics`, `/admin/reports`) | - | - | Role View | Role View | Full View |
| **User Governance & Admin Provisioning** (`/admin/users`, `/admin/create-admin`) | - | - | - | - | **Yes** |

---

## 4. Key Endpoints Reference

### Authentication (`/api/v1/auth`)
- `POST /register/student` - Self-registration for students with university email and registration index validation. *(Rate limited)*
- `POST /register/lecturer` - Registration request for academic faculty members. *(Rate limited)*
- `POST /verify-email` - Activates accounts using 24-hour verification token.
- `POST /resend-verification` - Re-issues a verification token. *(Rate limited)*
- `POST /login` - Returns JWT access token (60 min) and refresh token (7 days). *(Rate limited)*
- `POST /refresh` - Secure token rotation issuing a new access token pair.
- `POST /logout` - Terminates session and invalidates refresh token.
- `POST /forgot-password` - Dispatches password reset token. *(Rate limited)*
- `POST /reset-password` - Resets password with verified reset token.
- `PATCH /change-password` - Authenticated password update.

### Lecture Halls & Bookings (`/api/v1/bookings`, `/api/v1/halls`)
- `GET /halls` - Public lecture hall catalog with capacity, AC, sound, and projector filters.
- `POST /bookings/check-availability` - Real-time preflight availability check.
- `POST /bookings/upload-document` - Uploads supporting documents (max 50MB, PDF/images/Word).
- `POST /bookings` - Concurrency-safe hall reservation request with row-level locking.
- `GET /bookings` - Lists booking requests (students see own; admins see all).
- `PATCH /bookings/{booking_id}/status` - Facility Admin: approve or reject with reason.
- `PATCH /bookings/{booking_id}/cancel` - Student cancellation of pending bookings.

### Lecturer Consultations (`/api/v1/lecturers`, `/api/v1/meetings`)
- `GET /lecturers` - Browse lecturers with name and engineering department filters.
- `GET /lecturers/{lecturer_id}/available-slots` - Calculates discrete available meeting slots for a target date.
- `POST /lecturers/me/availability` - Lecturer: publishes recurring or specific consultation hours.
- `POST /meetings` - Student: submits consultation request for an available slot with clash prevention.
- `PATCH /meetings/{meeting_id}/status` - Lecturer: accepts or rejects consultation with notes.

### Laboratory Equipment & Inventory (`/api/v1/equipment`, `/api/v1/laboratories`)
- `GET /equipment` - Search equipment inventory and available quantities.
- `POST /equipment/borrows` - Student: requests equipment borrowing with date validation and inventory check.
- `PATCH /equipment/borrows/{borrow_id}/status` - Lab Admin: manages loan lifecycle (`APPROVED`, `ISSUED`, `COMPLETED`, `DAMAGED`).
- `POST /equipment/borrows/{borrow_id}/confirm-return` - Student: confirms physical return handover.

### 3D Printing & Fabrication Services (`/api/v1/services`)
- `GET /services/directory` - University marketplace of laboratory services.
- `POST /services/requests/3d-print` - Student: submits 3D print request with STL/CAD model upload.
- `PATCH /services/requests/{request_id}/status` - Lab Admin: schedules job, updates progress, and adds material charges in LKR.

### Notifications (`/api/v1/notifications`)
- `GET /notifications` - Lists in-app notifications with unread filtering.
- `GET /notifications/unread-count` - Returns unread notification count badge.
- `PATCH /notifications/{notification_id}/read` - Marks notification as read.
- `POST /notifications/mark-all-read` - Marks all notifications as read.

### Administration & Governance (`/api/v1/admin`)
- `GET /admin/metrics` - Role-tailored executive KPIs for Super Admin, Facility Admin, and Lab Admin.
- `GET /admin/reports` - Date-filtered reporting metrics (7d, 30d, 90d, custom dates) across facilities, equipment, services, and LKR revenue.
- `POST /admin/equipment/send-return-reminders` - Dispatches return reminders and overdue warnings to borrowers.
- `GET /admin/lecturers/pending` - Super Admin: lists unverified academic faculty registrations.
- `POST /admin/lecturers/{lecturer_id}/verify` - Super Admin: verifies or rejects lecturer accounts.
- `POST /admin/create-admin` - Super Admin: provisions Facility Admin, Lab Admin, or Super Admin accounts.
- `GET /admin/users` - Super Admin: user governance directory with search and role filters.
- `PATCH /admin/users/{user_id}/status` - Super Admin: activates or deactivates user accounts.
- `PATCH /admin/users/{user_id}/role` - Super Admin: updates user role permissions.
