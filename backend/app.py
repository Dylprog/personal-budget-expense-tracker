
from flask import Flask, jsonify, request
from flask_cors import CORS

from database import get_connection, initialise_database
import sqlite3

app = Flask(__name__)
CORS(app)

# Create the database table if it doesn't already exist.
initialise_database()


@app.route("/api/health", methods=["GET"])
def health_check():
    """Check that the backend API is running."""
    return jsonify({
        "status": "success",
        "message": "Budget Tracker API is running"
    })


@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    """Return all saved transactions."""
    connection = get_connection()

    rows = connection.execute(
        "SELECT * FROM transactions ORDER BY date DESC, id DESC"
    ).fetchall()

    connection.close()

    transactions = [dict(row) for row in rows]
    return jsonify(transactions)


@app.route("/api/transactions", methods=["POST"])
def create_transaction():
    """Validate and save a new transaction."""
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required."}), 400

    description = data.get("description")
    amount = data.get("amount")
    transaction_type = data.get("type")
    category = data.get("category")
    transaction_date = data.get("date")

    if not isinstance(description, str) or not description.strip():
        return jsonify({"error": "Description is required."}), 400

    if isinstance(amount, bool) or not isinstance(amount, (int, float)):
        return jsonify({"error": "Amount must be a number."}), 400

    if amount <= 0 or amount == float("inf") or amount != amount:
        return jsonify({"error": "Amount must be greater than zero."}), 400

    if transaction_type not in ("income", "expense"):
        return jsonify({"error": "Type must be income or expense."}), 400

    if not isinstance(category, str) or not category.strip():
        return jsonify({"error": "Category is required."}), 400

    if not isinstance(transaction_date, str) or not transaction_date.strip():
        return jsonify({"error": "Date is required."}), 400

    connection = get_connection()

    cursor = connection.execute(
        """
        INSERT INTO transactions
        (description, amount, type, category, date)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            description.strip(),
            amount,
            transaction_type,
            category.strip(),
            transaction_date.strip()
        )
    )

    connection.commit()

    saved_row = connection.execute(
        "SELECT * FROM transactions WHERE id = ?",
        (cursor.lastrowid,)
    ).fetchone()

    connection.close()

    return jsonify(dict(saved_row)), 201


@app.route("/api/transactions/<int:transaction_id>", methods=["DELETE"])
def delete_transaction(transaction_id):
    """Delete a transaction by its ID."""
    connection = get_connection()

    cursor = connection.execute(
        "DELETE FROM transactions WHERE id = ?",
        (transaction_id,)
    )

    connection.commit()
    connection.close()

    if cursor.rowcount == 0:
        return jsonify({"error": "Transaction not found."}), 404

    return jsonify({
        "message": "Transaction deleted successfully."
    }), 200


@app.route("/api/transactions/<int:transaction_id>", methods=["PUT"])
def update_transaction(transaction_id):
    """Update an existing transaction."""
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required."}), 400

    description = data.get("description")
    amount = data.get("amount")
    transaction_type = data.get("type")
    category = data.get("category")
    transaction_date = data.get("date")

    if not isinstance(description, str) or not description.strip():
        return jsonify({"error": "Description is required."}), 400

    if (
        isinstance(amount, bool)
        or not isinstance(amount, (int, float))
        or amount <= 0
        or not __import__("math").isfinite(amount)
    ):
        return jsonify({"error": "Amount must be a positive number."}), 400

    if transaction_type not in ("income", "expense"):
        return jsonify({"error": "Type must be income or expense."}), 400

    if not isinstance(category, str) or not category.strip():
        return jsonify({"error": "Category is required."}), 400

    if not isinstance(transaction_date, str) or not transaction_date.strip():
        return jsonify({"error": "Date is required."}), 400

    connection = get_connection()

    cursor = connection.execute(
        """
        UPDATE transactions
        SET description = ?, amount = ?, type = ?, category = ?, date = ?
        WHERE id = ?
        """,
        (
            description.strip(),
            amount,
            transaction_type,
            category.strip(),
            transaction_date.strip(),
            transaction_id,
        ),
    )

    connection.commit()

    if cursor.rowcount == 0:
        connection.close()
        return jsonify({"error": "Transaction not found."}), 404

    row = connection.execute(
        "SELECT * FROM transactions WHERE id = ?",
        (transaction_id,),
    ).fetchone()

    connection.close()

    return jsonify(dict(row)), 200


@app.route("/api/budgets", methods=["GET"])
def get_budgets():
    """Return monthly budgets with spending and remaining amounts."""
    month = request.args.get("month")

    connection = get_connection()

    query = """
        SELECT
            b.id,
            b.category,
            b.month,
            b.limit_amount,
            COALESCE(SUM(t.amount), 0) AS spent
        FROM budgets b
        LEFT JOIN transactions t
            ON t.category = b.category
            AND substr(t.date, 1, 7) = b.month
            AND t.type = 'expense'
    """

    parameters = []

    if month:
        query += " WHERE b.month = ?"
        parameters.append(month)

    query += """
        GROUP BY b.id, b.category, b.month, b.limit_amount
        ORDER BY b.month DESC, b.category ASC
    """

    rows = connection.execute(query, parameters).fetchall()
    connection.close()

    budgets = []

    for row in rows:
        budget = dict(row)
        budget["remaining"] = budget["limit_amount"] - budget["spent"]
        budget["spent"] = round(budget["spent"], 2)
        budget["remaining"] = round(budget["remaining"], 2)
        budgets.append(budget)

    return jsonify(budgets)


@app.route("/api/budgets", methods=["POST"])
def create_budget():
    """Create a budget for a category and month."""
    data = request.get_json(silent=True) or {}

    category = data.get("category")
    month = data.get("month")
    limit_amount = data.get("limit_amount")

    if not isinstance(category, str) or not category.strip():
        return jsonify({"error": "Category is required."}), 400

    if not isinstance(month, str) or len(month) != 7:
        return jsonify({"error": "Month must use YYYY-MM format."}), 400

    try:
        limit_amount = float(limit_amount)
    except (TypeError, ValueError):
        return jsonify({"error": "Budget limit must be a number."}), 400

    if not 0 < limit_amount < float("inf"):
        return jsonify({"error": "Budget limit must be greater than zero."}), 400

    category = category.strip()

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            INSERT INTO budgets (category, month, limit_amount)
            VALUES (?, ?, ?)
            """,
            (category, month, limit_amount),
        )
        connection.commit()

        row = connection.execute(
            "SELECT * FROM budgets WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

        return jsonify(dict(row)), 201

    except sqlite3.IntegrityError:
        connection.rollback()
        return jsonify({
            "error": "A budget already exists for this category and month."
        }), 409

    finally:
        connection.close()


@app.route("/api/budgets/<int:budget_id>", methods=["PUT"])
def update_budget(budget_id):
    """Update an existing budget's category, month, and limit."""
    data = request.get_json(silent=True) or {}

    category = data.get("category")
    month = data.get("month")
    limit_amount = data.get("limit_amount")

    if not isinstance(category, str) or not category.strip():
        return jsonify({"error": "Category is required."}), 400

    if not isinstance(month, str) or len(month) != 7:
        return jsonify({"error": "Month must use YYYY-MM format."}), 400

    try:
        limit_amount = float(limit_amount)
    except (TypeError, ValueError):
        return jsonify({"error": "Budget limit must be a number."}), 400

    if not 0 < limit_amount < float("inf"):
        return jsonify({"error": "Budget limit must be greater than zero."}), 400

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            UPDATE budgets
            SET category = ?, month = ?, limit_amount = ?
            WHERE id = ?
            """,
            (category.strip(), month, limit_amount, budget_id),
        )
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Budget not found."}), 404

        row = connection.execute(
            "SELECT * FROM budgets WHERE id = ?",
            (budget_id,),
        ).fetchone()

        return jsonify(dict(row))

    except sqlite3.IntegrityError:
        connection.rollback()
        return jsonify({
            "error": "A budget already exists for this category and month."
        }), 409

    finally:
        connection.close()


@app.route("/api/budgets/<int:budget_id>", methods=["DELETE"])
def delete_budget(budget_id):
    """Delete a monthly budget."""
    connection = get_connection()

    cursor = connection.execute(
        "DELETE FROM budgets WHERE id = ?",
        (budget_id,),
    )
    connection.commit()
    connection.close()

    if cursor.rowcount == 0:
        return jsonify({"error": "Budget not found."}), 404

    return jsonify({"message": "Budget deleted successfully."})


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=5000)
