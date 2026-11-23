# University Resource Booking and Management System (URBMS)
### Faculty of Engineering — University of Sri Jayewardenepura (USJ)

A modern, enterprise-grade university resource booking, consultation scheduling, laboratory equipment loaning, and rapid prototyping management system built with completely decoupled frontend and backend architectures.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Key Details |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14 (App Router)** | TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons |
| **Backend** | **Python FastAPI** | Asynchronous REST API, Pydantic v2, JWT RBAC |
| **Database** | **PostgreSQL 16** | Declarative SQLAlchemy 2.0 (Asyncpg), Connection Pooling |
| **Migrations** | **Alembic** | Automated schema migrations |
| **DevOps** | **Docker Compose** | Multi-container setup for DB, Redis, Backend, Frontend |

---

## 📁 Project Structure

```
usj-foe-resource-manager/
├── docker-compose.yml              # Multi-container orchestration (DB, Redis, Backend, Frontend)
├── README.md
│
├── backend/                        # Python FastAPI Backend
│   ├── alembic/                    # Database migration environment
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── app/
│   │   ├── main.py                 # App entrypoint, CORS, static mounts
│   │   ├── core/                   # Config, Database engine, Security, Dependencies
│   │   ├── models/                 # SQLAlchemy 2.0 ORM tables
│   │   ├── schemas/                # Pydantic v2 DTO request/response models
│   │   ├── services/               # Clash detection, stock checks, 3D printing calculator
│   │   └── api/v1/endpoints/       # REST routes (auth, facilities, lecturers, equipment, services, reports)
│   └── scripts/
│       └── seed_data.py            # Pre-populates USJ departments, users, halls, and labs
│
└── frontend/                       # Next.js 14 TypeScript Frontend
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── Dockerfile
    └── src/
        ├── app/                    # Next.js App Router pages
        │   ├── (auth)/             # Login & Registration pages
        │   ├── halls/              # Lecture Hall directory & booking engine
        │   ├── lecturers/          # Academic staff directory & office hour booking
        │   ├── equipment/          # Lab equipment inventory & borrow requests
        │   ├── services/           # FabLab 3D printing submission wizard
        │   ├── my-requests/        # Unified status tracker for all user petitions
        │   └── admin/              # Role-protected Admin management center
        ├── components/             # Reusable shadcn/ui components & navigation
        ├── lib/                    # Axios API client, Auth Context, utilities
        └── types/                  # TypeScript interface definitions
```

---

## 🚀 Quickstart Guide

### Option 1: Docker Compose (Recommended)

Run the complete stack with a single command:

```bash
docker compose up --build
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger):** [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **API Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### Option 2: Running Locally

#### 1. Backend Setup (FastAPI & PostgreSQL)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run database migrations
alembic upgrade head

# Seed initial data (USJ Engineering departments, halls, equipment)
python -m scripts.seed_data

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-seeded Demo Accounts

The database seed script initializes the following credentials for testing:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@eng.sjp.ac.lk` | `Admin@USJ2026!` | Global access, user role promotion, system audit |
| **Lecturer** | `kamal@eng.sjp.ac.lk` | `Lecturer@USJ2026!` | Consultation slots, student meeting approvals |
| **Student** | `student@eng.sjp.ac.lk` | `Student@USJ2026!` | Facility bookings, equipment loans, 3D printing |

*Tip: The login page includes quick 1-click demo buttons to automatically populate these credentials.*

---

## 📚 Technical Documentation & Guides

- [API Specification & Swagger Guide](file:///C:/Users/USER/.gemini/antigravity/scratch/usj-foe-resource-manager/API_DOCUMENTATION.md) — Complete endpoint catalog, authentication headers, error schemas, and RBAC matrix.
- [Production Deployment Guide](file:///C:/Users/USER/.gemini/antigravity/scratch/usj-foe-resource-manager/DEPLOYMENT.md) — Deployment instructions for Vercel, Render, AWS, Docker, SSL, and custom domain setup.
- [Database Migration Guide](file:///C:/Users/USER/.gemini/antigravity/scratch/usj-foe-resource-manager/MIGRATIONS.md) — Alembic database migrations, rollback strategies, and data seeding.
- [System Architecture Specification](file:///C:/Users/USER/.gemini/antigravity/brain/b7a8b455-2c1b-4f3f-b35a-dd334090bb29/system_architecture_and_specification.md) — Architectural blueprints, ER diagrams, state machines, and sequence diagrams.

---

## 🧪 Automated Testing & Quality Assurance

### Run Backend Tests (Pytest - 38 Tests)
```bash
cd backend
pytest -v
```
Covers:
- Super Admin, Facility Admin, and Lab Admin metrics & governance
- Student registration, domain verification, and password recovery
- Hall booking clash prevention and maintenance blocks
- Lecturer office hours and meeting scheduling
- Equipment inventory tracking, damaged loan handling, and return reminders
- Rapid prototyping (3D printing) lifecycle
- Rate limiting on sensitive endpoints
- File upload extension and size limit validation
- SQL injection protection
- Complete end-to-end 9 core workflows

### Run Frontend Tests (Node Native Test Runner - 18 Tests)
```bash
cd frontend
npm test
```
Covers:
- Student registration and login Zod form validation
- Lecture hall time-range validation
- 3D printing parameter validation
- JWT decoding, expiration checks, and token rotation
- Role-based navigation item derivation for all 5 roles
- Protected route permission enforcement
- Hall utilization and 3D print quotation algorithms

---

## 💡 Key System Highlights

1. **Double-Booking & Conflict Engine:** Database transactions with interval overlap queries (`start_time < existing.end_time AND end_time > existing.start_time`) prevent conflicting bookings in lecture halls and auditoriums.
2. **CAD Slicing & 3D Print Pipeline:** Students upload `.stl` / `.obj` files with material and infill parameters. Technicians review sliced models, input filament weight & print hours, and return dynamic quotes in Sri Lankan Rupees (LKR).
3. **Equipment Check-out & Return Lifecycle:** Real-time stock decrement on issue and condition inspection logging upon return.
4. **Role-Based Access Control:** Secure JWT authentication with rotatable refresh tokens protecting administrative routes.
