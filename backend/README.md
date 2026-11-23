# USJ FOE Resource Booking & Management System — Backend API

Backend REST API for the **University Resource Booking and Management System (URBMS)**, Faculty of Engineering, University of Sri Jayewardenepura.

Built with **Python FastAPI**, **SQLAlchemy 2.0 (Async)**, **Alembic**, and **PostgreSQL**.

---

## 🏛️ Architecture & Folder Structure

The project follows clean architecture with clear separation of responsibilities:

```
backend/
├── alembic/                         # Database migration scripts
│   ├── versions/                    # Revision files (e.g. 001_initial_schema.py)
│   └── env.py                       # Migration runner with async engine
├── alembic.ini                      # Alembic configuration
├── Dockerfile                       # Production container setup
├── requirements.txt                 # Python package dependencies
├── .env.example                     # Environment configuration template
│
├── app/
│   ├── main.py                      # FastAPI initialization, CORS, middlewares, Swagger docs
│   │
│   ├── core/                        # Core infrastructural components
│   │   ├── config.py                # Pydantic BaseSettings loading from .env
│   │   ├── database.py              # Async SQLAlchemy engine & session dependency (get_db)
│   │   ├── logging.py               # Structured logging & request duration middleware
│   │   ├── security.py              # Password hashing (bcrypt) & JWT token handling
│   │   ├── exceptions.py            # Centralized exception handlers & custom errors
│   │   └── dependencies.py          # Auth injection & Role-Based Access Control (RBAC) guards
│   │
│   ├── models/                      # SQLAlchemy 2.0 ORM database models
│   │   ├── user.py                  # User and RefreshToken models
│   │   ├── department.py            # Engineering department model
│   │   ├── facility.py              # Lecture halls, auditoriums, seminar rooms
│   │   ├── facility_booking.py      # Bookings with status and intervals
│   │   ├── lecturer_availability.py # Weekly recurring office hours
│   │   ├── lecturer_meeting.py      # One-on-one student consultations
│   │   ├── laboratory.py            # Lab facilities and safety protocols
│   │   ├── equipment.py             # Inventory catalog, condition, and quantities
│   │   ├── equipment_borrow.py      # Equipment loan records
│   │   ├── lab_service.py           # Technical service catalog (3D printing, PCB milling)
│   │   ├── service_request.py       # 3D print petitions & CAD file details
│   │   ├── notification.py          # In-app notifications
│   │   └── audit_log.py             # System audit trail
│   │
│   ├── schemas/                     # Pydantic v2 DTOs (Request & Response validation)
│   │   ├── auth.py                  # Login, Register, Refresh Token DTOs
│   │   ├── user.py                  # User profile and role DTOs
│   │   ├── facility.py              # Hall specs and creation DTOs
│   │   ├── facility_booking.py      # Booking requests and status updates
│   │   ├── lecturer_meeting.py      # Availability and consultation DTOs
│   │   ├── equipment.py             # Equipment inventory and loan DTOs
│   │   ├── service_request.py       # 3D print specs, slicing estimates, and quotes
│   │   └── notification.py          # Notification DTOs
│   │
│   ├── services/                    # Domain business logic layer
│   │   ├── auth_service.py          # Registration, password hashing, and token issuance
│   │   ├── user_service.py          # Profile management and directories
│   │   ├── lecturer_service.py      # Academic schedules and office hours
│   │   ├── hall_service.py          # Lecture hall management
│   │   ├── booking_service.py       # Double-booking collision detection engine
│   │   ├── meeting_service.py       # Consultation bookings and approvals
│   │   ├── laboratory_service.py    # Lab registration and management
│   │   ├── equipment_service.py     # Stock reservations, loan check-outs, and returns
│   │   ├── service_request_service.py # 3D CAD upload handling and print lifecycle
│   │   ├── print_3d_service.py      # Filament and machine hourly cost calculator (LKR)
│   │   ├── notification_service.py  # In-app alert dispatching
│   │   └── admin_service.py         # System KPI metrics and user governance
│   │
│   └── api/
│       └── v1/
│           ├── api.py               # Master router gathering all module endpoints
│           └── endpoints/           # Clean HTTP route controllers
│               ├── health.py        # System health & database readiness probes
│               ├── auth.py          # Authentication & JWT tokens
│               ├── users.py         # Profiles & departments
│               ├── students.py      # Student directories & index searches
│               ├── lecturers.py     # Academic staff & office hours
│               ├── halls.py         # Lecture halls & auditoriums
│               ├── bookings.py      # Hall booking petitions & clash checks
│               ├── meetings.py      # Student-lecturer consultations
│               ├── laboratories.py  # Laboratory directory
│               ├── equipment.py     # Equipment inventory & loans
│               ├── service_requests.py # FabLab 3D printing & services
│               ├── notifications.py # In-app notification center
│               └── administration.py # Admin metrics & governance
│
└── scripts/
    └── seed_data.py                 # Initial data populator (departments, users, halls, labs)
```

---

## 🚀 Beginner-Friendly Setup Instructions

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Python 3.11+** (Check with `python --version`)
- **PostgreSQL 15+** running locally (or via Docker)
- **Git**

---

### 2. Step-by-Step Local Setup

#### Step 2.1: Open Terminal & Navigate to Backend
Open **PowerShell** (on Windows) or **Terminal** (on macOS/Linux):

```bash
cd C:\Users\USER\.gemini\antigravity\scratch\usj-foe-resource-manager\backend
```

#### Step 2.2: Create a Virtual Environment
A virtual environment keeps your project dependencies isolated from the rest of your system:

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```
*(If you see an execution policy error on Windows, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and then run the script again).*

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

*(You will know it is activated when you see `(venv)` at the beginning of your terminal prompt).*

#### Step 2.3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### Step 2.4: Configure Environment Variables
Copy the `.env.example` file to `.env`:

**On Windows:**
```powershell
Copy-Item .env.example .env
```

**On macOS / Linux:**
```bash
cp .env.example .env
```

Open `.env` in any text editor and make sure your PostgreSQL credentials match:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=usj_resource_db
```

#### Step 2.5: Create the PostgreSQL Database
If `usj_resource_db` does not exist yet, create it:

- Using **pgAdmin**: Right-click "Databases" -> "Create" -> "Database..." -> Name: `usj_resource_db`.
- Or using **psql CLI**:
  ```sql
  CREATE DATABASE usj_resource_db;
  ```

#### Step 2.6: Run Database Migrations
Apply the initial schema migration using Alembic:
```bash
alembic upgrade head
```

#### Step 2.7: Seed Initial Faculty Data
Populate default USJ engineering departments, sample lecture halls (E1, E2, Auditorium), labs, equipment, and user accounts:
```bash
python -m scripts.seed_data
```

#### Step 2.8: Start the Development Server
```bash
uvicorn app.main:app --reload --port 8000
```

---

## 🌐 Verifying & Testing the API

Once uvicorn is running, open your web browser:

| Resource | URL | Description |
| :--- | :--- | :--- |
| **Interactive Swagger UI** | [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs) | Interactive API explorer & testing tool |
| **Alternative ReDoc UI** | [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc) | Clean documentation view |
| **Liveness Health Check** | [http://localhost:8000/health](http://localhost:8000/health) | Basic server ping |
| **Database Readiness Probe** | [http://localhost:8000/api/v1/health/ready](http://localhost:8000/api/v1/health/ready) | Verifies live PostgreSQL connectivity |

---

## 🔑 Pre-seeded Testing Accounts

Use these pre-configured credentials to test different user roles:

| Role | Email | Password | What You Can Test |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@eng.sjp.ac.lk` | `Admin@USJ2026!` | User role elevation, metrics, faculty-wide overrides |
| **Lecturer** | `kamal@eng.sjp.ac.lk` | `Lecturer@USJ2026!` | Create consultation office hours, confirm student meetings |
| **Student** | `student@eng.sjp.ac.lk` | `Student@USJ2026!` | Book lecture halls, borrow equipment, submit 3D prints |

---

## 🛡️ Error Handling & Response Format

All API errors return a standardized JSON envelope:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Facility is already booked between 2026-11-05 10:00 and 12:00",
    "details": null
  }
}
```
