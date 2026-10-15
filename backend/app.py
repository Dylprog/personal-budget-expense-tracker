
from flask import Flask, jsonify, request
from flask_cors import CORS

from database import get_connection, initialise_database

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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
