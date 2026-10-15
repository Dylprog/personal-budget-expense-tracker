import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:5000/api/transactions";

function App() {
  const [transactions, setTransactions] = useState([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  async function loadTransactions() {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Could not load transactions.");
      }

      const data = await response.json();
      setTransactions(data);
      setError("");
    } catch {
      setError("Could not connect to the backend. Is Flask running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  function startEditing(transaction) {
    setEditingId(transaction.id);
    setDescription(transaction.description);
    setAmount(String(transaction.amount));
    setType(transaction.type);
    setCategory(transaction.category);
    setDate(transaction.date);
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setType("expense");
    setCategory("Food");
    setDate(new Date().toLocaleDateString("en-CA"));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const isEditing = editingId !== null;
    const url = isEditing ? `${API_URL}/${editingId}` : API_URL;

    try {
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount: Number(amount),
          type,
          category,
          date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save transaction.");
      }

      cancelEditing();
      await loadTransactions();
    } catch (err) {
      setError(err.message || "Could not save transaction.");
    }
  }

  async function handleDelete(transactionId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await fetch(`${API_URL}/${transactionId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete transaction.");
      }

      await loadTransactions();
    } catch (err) {
      setError(err.message || "Could not delete transaction.");
    }
  }

  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const balance = income - expenses;

  const money = (value) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(value);

  return (
    <main className="app">
      <header className="page-header">
        <div>
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>Budget Tracker</h1>
          <p className="subtitle">
            Keep track of your money, one transaction at a time.
          </p>
        </div>
      </header>

      <section className="summary-grid" aria-label="Financial summary">
        <article className="summary-card">
          <p>Total income</p>
          <h2>{money(income)}</h2>
        </article>
        <article className="summary-card">
          <p>Total expenses</p>
          <h2>{money(expenses)}</h2>
        </article>
        <article className="summary-card">
          <p>Current balance</p>
          <h2>{money(balance)}</h2>
        </article>
      </section>

      <section className="content-grid">
        <section className="panel">
          <h2>{editingId !== null ? "Edit transaction" : "Add transaction"}</h2>
          <p className="panel-description">
            Record money coming in or going out.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="description">Description</label>
            <input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Groceries"
              required
            />

            <label htmlFor="amount">Amount (€)</label>
            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              required
            />

            <label htmlFor="type">Transaction type</label>
            <select
              id="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>

            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>Food</option>
              <option>Transport</option>
              <option>Housing</option>
              <option>Entertainment</option>
              <option>Utilities</option>
              <option>Salary</option>
              <option>Other</option>
            </select>

            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />

            <div className="form-actions">
              <button type="submit">
                {editingId !== null ? "Update transaction" : "Save transaction"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="panel">
          <h2>Recent transactions</h2>
          <p className="panel-description">Your saved income and expenses.</p>

          {loading ? (
            <p>Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p>No transactions yet. Add your first one!</p>
          ) : (
            <div className="transaction-list">
              {transactions.map((transaction) => (
                <article className="transaction" key={transaction.id}>
                  <div className="transaction-details">
                    <strong>{transaction.description}</strong>
                    <span>
                      {transaction.category} · {transaction.date}
                    </span>
                  </div>
                  <div className="transaction-actions">
                    <strong
                      className={
                        transaction.type === "income" ? "income" : "expense"
                      }
                    >
                      {transaction.type === "income" ? "+" : "−"}
                      {money(transaction.amount)}
                    </strong>

                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => startEditing(transaction)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDelete(transaction.id)}
                      aria-label={`Delete ${transaction.description}`}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
