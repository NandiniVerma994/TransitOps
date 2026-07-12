# TransitOps Backend

Go backend for the TransitOps transport operations platform.

## Stack

- Go
- PostgreSQL
- `database/sql` with the pgx driver

## Setup

```sh
cp .env.example .env
```

Create a PostgreSQL database, then run the first migration:

```sh
go run ./cmd/migrate
```

Start the API:

```sh
go run ./cmd/api
```

Health check:

```sh
curl http://localhost:8080/health
```

Create a company-provided user account:

```sh
go run ./cmd/create-user -email manager@example.com -password password123 -role "Fleet Manager"
```

Seed default company accounts, excluding drivers:

```sh
go run ./cmd/seed
```

The seed command upserts these users. Plain passwords are used only as seed input;
the database stores bcrypt password hashes.

| Email | Password | Role |
| --- | --- | --- |
| `fleet.manager@transitops.local` | `FleetManager@123` | `Fleet Manager` |
| `safety.officer@transitops.local` | `SafetyOfficer@123` | `Safety Officer` |
| `finance.analyst@transitops.local` | `FinanceAnalyst@123` | `Financial Analyst` |

## Auth API

- `POST /api/auth/login`: public login for company-provided credentials.
- `GET /api/auth/me`: returns the current authenticated user from the bearer token.
- `POST /api/auth/users`: Fleet Manager-only user creation.
- `GET /api/auth/roles`: Fleet Manager-only role list for account creation UI.
