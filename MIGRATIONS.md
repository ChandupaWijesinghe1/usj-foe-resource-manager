# Database Migration Guide (Alembic & PostgreSQL)

This document provides step-by-step instructions for managing database migrations, running schema synchronizations, rollback procedures, and seeding production data for the **University of Sri Jayewardenepura Faculty of Engineering Resource Manager**.

---

## 1. Overview

The backend uses **SQLAlchemy 2.0 (async)** with **Alembic** to manage PostgreSQL schema evolutions.

- **Migration Config**: [`backend/alembic.ini`](file:///C:/Users/USER/.gemini/antigravity/scratch/usj-foe-resource-manager/backend/alembic.ini)
- **Environment & Models**: [`backend/alembic/env.py`](file:///C:/Users/USER/.gemini/antigravity/scratch/usj-foe-resource-manager/backend/alembic/env.py)
- **Migration Versions**: [`backend/alembic/versions/`](file:///C:/Users/USER/.gemini/antigravity/scratch/usj-foe-resource-manager/backend/alembic/versions/)

---

## 2. Prerequisites

Ensure your virtual environment is active and database credentials are set in `.env`:

```bash
cd backend
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

Verify database connectivity:
```bash
python -c "import asyncio; from app.core.database import check_db_connection; print(asyncio.run(check_db_connection()))"
```

---

## 3. Migration Commands

### A. Run All Pending Migrations (Upgrade to Head)
Executes all unapplied database migrations:
```bash
alembic upgrade head
```

### B. Generate a New Autodetected Migration
When models in `app/models/` are created or modified:
```bash
alembic revision --autogenerate -m "add_column_name_to_table"
```
> [!IMPORTANT]
> Always review the generated script in `alembic/versions/` before applying it to production.

### C. Check Current Revision
Displays the current schema version applied to your database:
```bash
alembic current
```

### D. View Migration History
Lists all migrations in chronological order:
```bash
alembic history --verbose
```

### E. Roll Back to a Previous Migration (Downgrade)
Roll back by 1 revision:
```bash
alembic downgrade -1
```

Roll back to a specific revision ID:
```bash
alembic downgrade <revision_id>
```

Roll back all migrations (reset schema to empty):
```bash
alembic downgrade base
```

---

## 4. Seeding Initial Faculty Data

Once migrations are applied, run the database seed script to populate departments, initial lecture halls, laboratory profiles, and the default Super Admin account:

```bash
python scripts/seed_db.py
```

### Default Pre-Seeded Accounts:
| Role | Email | Password |
|---|---|---|
| **Super Admin** | `admin@eng.sjp.ac.lk` | `Admin@USJ2026!` |
| **Faculty Lecturer** | `lecturer.kamal@eng.sjp.ac.lk` | `Lecturer@USJ2026!` |
| **Student** | `nuwan.student@eng.sjp.ac.lk` | `Student@USJ2026!` |

---

## 5. Production Zero-Downtime Migration Strategy

1. **Staging Verification**: Always run `alembic upgrade head` against a staging database first.
2. **Backward Compatibility**: When renaming or dropping columns, follow a 2-phase deployment (add new column &rarr; deploy code &rarr; drop old column).
3. **Locking Considerations**: Row-level locking (`with_for_update`) is used in application logic. When creating indexes on large tables in production, use `CONCURRENTLY`.
