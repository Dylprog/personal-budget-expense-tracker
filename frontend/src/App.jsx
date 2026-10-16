import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:5000/api/transactions";
const BUDGET_API_URL = "http://127.0.0.1:5000/api/budgets";

function App() {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetMonth, setBudgetMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [budgetCategory, setBudgetCategory] = useState("Food");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [budgetMessage, setBudgetMessage] = useState("");
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState(null);
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

  async function loadBudgets() {
    setBudgetLoading(true);
    setBudgetError("");

    try {
      const response = await fetch(`${BUDGET_API_URL}?month=${budgetMonth}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load budgets.");
      }

      setBudgets(data);
    } catch (err) {
      setBudgetError(err.message || "Could not connect to the budget API.");
    } finally {
      setBudgetLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [budgetMonth]);

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
      await loadBudgets();
    } catch (err) {
      setError(err.message || "Could not save transaction.");
    }
  }

  async function handleBudgetSubmit(event) {
    event.preventDefault();
    setBudgetError("");
    setBudgetMessage("");

    const isEditing = editingBudgetId !== null;
    const url = isEditing
      ? `${BUDGET_API_URL}/${editingBudgetId}`
      : BUDGET_API_URL;

    try {
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: budgetCategory,
          month: budgetMonth,
          limit_amount: Number(budgetLimit),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save budget.");
      }

      setBudgetLimit("");
      setEditingBudgetId(null);
      setBudgetMessage(
        isEditing
          ? "Budget updated successfully."
          : "Budget created successfully."
      );

      await loadBudgets();
    } catch (err) {
      setBudgetError(err.message || "Could not save budget.");
    }
  }

  function startEditingBudget(budget) {
    setEditingBudgetId(budget.id);
    setBudgetCategory(budget.category);
    setBudgetLimit(String(budget.limit_amount));
    setBudgetMonth(budget.month);
    setBudgetError("");
    setBudgetMessage("");
  }

  function cancelBudgetEditing() {
    setEditingBudgetId(null);
    setBudgetCategory("Food");
    setBudgetLimit("");
    setBudgetError("");
    setBudgetMessage("");
  }

  async function handleBudgetDelete(budgetId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this budget?"
    );

    if (!confirmed) return;

    setBudgetError("");
    setBudgetMessage("");

    try {
      const response = await fetch(`${BUDGET_API_URL}/${budgetId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete budget.");
      }

      if (editingBudgetId === budgetId) {
        cancelBudgetEditing();
      }

      setBudgetMessage("Budget deleted successfully.");
      await loadBudgets();
    } catch (err) {
      setBudgetError(err.message || "Could not delete budget.");
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
      await loadBudgets();
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

      <section className="panel budget-panel">
        <h2>Monthly budgets</h2>
        <p className="panel-description">
          Set spending limits and track how much remains in each category.
        </p>

        <label htmlFor="budgetMonth">Budget month</label>
        <input
          id="budgetMonth"
          type="month"
          value={budgetMonth}
          onChange={(event) => {
            setBudgetMonth(event.target.value);
            setEditingBudgetId(null);
            setBudgetLimit("");
            setBudgetError("");
            setBudgetMessage("");
          }}
          required
        />

        <form onSubmit={handleBudgetSubmit}>
          <label htmlFor="budgetCategory">Category</label>
          <select
            id="budgetCategory"
            value={budgetCategory}
            onChange={(event) => setBudgetCategory(event.target.value)}
            required
          >
            <option>Food</option>
            <option>Transport</option>
            <option>Housing</option>
            <option>Entertainment</option>
            <option>Utilities</option>
            <option>Other</option>
          </select>

          <label htmlFor="budgetLimit">Monthly limit (€)</label>
          <input
            id="budgetLimit"
            type="number"
            min="0.01"
            step="0.01"
            value={budgetLimit}
            onChange={(event) => setBudgetLimit(event.target.value)}
            placeholder="e.g. 300.00"
            required
          />

          <div className="form-actions">
            <button type="submit">
              {editingBudgetId !== null ? "Update budget" : "Save budget"}
            </button>

            {editingBudgetId !== null && (
              <button
                type="button"
                className="cancel-button"
                onClick={cancelBudgetEditing}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {budgetError && (
          <p className="error-message" role="alert">
            {budgetError}
          </p>
        )}

        {budgetMessage && (
          <p className="budget-success" role="status">
            {budgetMessage}
          </p>
        )}

        <h3>Budgets for {budgetMonth}</h3>

        {budgetLoading ? (
          <p>Loading budgets...</p>
        ) : budgets.length === 0 ? (
          <p>No budgets for this month yet. Add your first one above.</p>
        ) : (
          <div className="budget-list">
            {budgets.map((budget) => {
              const percentage = (budget.spent / budget.limit_amount) * 100;

              return (
                <article className="budget-card" key={budget.id}>
                  <div className="budget-card-header">
                    <div>
                      <h3>{budget.category}</h3>
                      <p>
                        {money(budget.spent)} spent of{" "}
                        {money(budget.limit_amount)}
                      </p>
                    </div>
                    <strong
                      className={budget.remaining < 0 ? "expense" : "income"}
                    >
                      {money(budget.remaining)} remaining
                    </strong>
                  </div>

                  <div
                    className="budget-progress-track"
                    role="progressbar"
                    aria-label={`${budget.category} budget used`}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={Math.min(100, Math.max(0, percentage))}
                  >
                    <div
                      className={`budget-progress-fill ${
                        percentage >= 100 ? "over-budget" : ""
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, percentage))}%`,
                      }}
                    />
                  </div>

                  <p className="budget-usage">
                    {percentage.toFixed(1)}% used
                    {budget.remaining < 0 && " — Over budget"}
                  </p>

                  <div className="transaction-actions">
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => startEditingBudget(budget)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleBudgetDelete(budget.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
