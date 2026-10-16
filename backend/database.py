
import sqlite3

DATABASE = "budget_tracker.db"


def get_connection():
    """Open a connection to the SQLite database."""
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialise_database():
    """Create the transactions table if it does not exist."""
    connection = get_connection()
    # data table for transactions
    connection.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount REAL NOT NULL CHECK (amount > 0),
            type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            category TEXT NOT NULL,
            date TEXT NOT NULL
        )
    """)
    # data table for budgets
    connection.execute(""" 
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            month TEXT NOT NULL,
            limit_amount REAL NOT NULL CHECK (limit_amount > 0),
            UNIQUE (category, month)
        )
    """)


    connection.commit()
    connection.close()


if __name__ == "__main__":
    initialise_database()
    print("Database initialised successfully.")
