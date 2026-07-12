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

Default seeded users use `SEED_USER_PASSWORD`:

- `fleet.manager@transitops.local`
- `safety.officer@transitops.local`
- `finance.analyst@transitops.local`

## Auth API

- `POST /api/auth/login`: public login for company-provided credentials.
- `GET /api/auth/me`: returns the current authenticated user from the bearer token.
- `POST /api/auth/users`: Fleet Manager-only user creation.
- `GET /api/auth/roles`: Fleet Manager-only role list for account creation UI.
