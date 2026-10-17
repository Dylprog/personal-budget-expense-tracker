Personal Budget & Expense Tracker

Overview
The personal budget and expense tracker is a single page web application which allows users to record income and expenses, it organises these transactions through categories. These together help manage and monitor monthly spending limits that are predefined.

Features
Create, view, edit and delete (CRUD) transactions.
Define transactions as either income or expenses.
View financial summaries with visual aids.
Create and manage monthly budgets by each category.
Track spending against budget limits for each category.
View remaining budget allowanaces for each category.
Automatically update budgets when expenses are added, edited or deleted.
Run automated backend API tests.

Stack
Frontend - Reach & Vite.
Backend - Pyrrhon & Flask.
Database - SQLite.
API - REST endpoints.
Version control - GitHub

Structure
frontend/ - reach user interface.
backend/ - Flask API, database logic and automated tests.
database/ - database-related project files.
README>md - project documentation.

Running the Application
Backend

1. Open a terminal in backend/ directory.
2. Activate the Python virtual environment.
3. Install the dependencies if necessary: pip install -r requirements.txt
4. Start the backend: python app.py
   The backend should be available at http://127.0.0.1:5000/.

Frontend

1. Open a new terminal in the frontend/ directory.
2. Install the frontend dependencies if necessary: npm install
3. Start the development server: npm run dev
   Open the local address printed by Vite, http://localhost:5173/.

Testing
From the backend/ directory, activiate the virtual environment and run: python -m unittest test_app -v
The automated tests cover:
The health endpoint.
Budget creation and retrieval.
Duplicate and invalid budgets.
Budget updates and deletion.
The effect of creating, editing and deleting expenses on budget calculations.

Repository
GitHub: https://github.com/Dyprog/personal-budget-expense-tracker

Status
The application is under development as part of a university software development project. The implementation and documentation will be updated as extra features and deployment configuration are completed.
