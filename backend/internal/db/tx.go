package db

import (
	"context"
	"database/sql"
	"fmt"
)

type contextKey string

const txKey contextKey = "tx"

// Queryer interface defines common database execution operations.
// Both *sql.DB and *sql.Tx implement this interface.
type Queryer interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

type TxManager struct {
	db *sql.DB
}

func NewTxManager(db *sql.DB) *TxManager {
	return &TxManager{db: db}
}

// ExecTx executes a function inside a database transaction.
// If the function returns an error, the transaction is rolled back.
// Otherwise, it is committed.
func (m *TxManager) ExecTx(ctx context.Context, fn func(context.Context) error) error {
	tx, err := m.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	txCtx := context.WithValue(ctx, txKey, tx)
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p) // re-throw panic after rollback
		}
	}()

	if err := fn(txCtx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("tx error: %v, rollback error: %w", err, rbErr)
		}
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

// GetQueryer returns the transaction from the context if it exists,
// otherwise it returns the default *sql.DB instance.
func GetQueryer(ctx context.Context, defaultDB *sql.DB) Queryer {
	if tx, ok := ctx.Value(txKey).(*sql.Tx); ok {
		return tx
	}
	return defaultDB
}
