# Database Seeding

This project ships with a comprehensive Faker-powered seed script that fills the database with realistic demo data across all core domains: users, instructors, courses, learning progress, transactions, interactions, support and system settings.

## Prerequisites

- PostgreSQL database configured in `.env` (defaults are defined in `src/config/env.js`).
- Dependencies installed (`npm install`).

## Usage

```bash
# Populate while preserving existing schema/data
npm run seed

# Drop and recreate all tables before seeding
npm run seed -- --fresh

# Suppress console output (useful in CI)
npm run seed -- --quiet
```

The script creates deterministic yet varied data so you can immediately exercise the API endpoints (authentication, course browsing, enrollments, quizzes, payments, support, etc.).

Default credential for all generated users (admins, instructors, students) is:

- Email: generated per user (see seed logs for details)
- Password: `Password123!` (override with `SEED_DEFAULT_PASSWORD` in your environment).
