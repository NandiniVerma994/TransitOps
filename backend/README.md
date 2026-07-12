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
