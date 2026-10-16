
import os
import tempfile
import unittest

import app as app_module


class BudgetTrackerAPITests(unittest.TestCase):
    def setUp(self):
        # Give each test its own temporary database.
        self.temp_db = tempfile.NamedTemporaryFile(delete=False)
        self.temp_db.close()

        self.original_database = app_module.get_connection.__globals__["DATABASE"]
        app_module.get_connection.__globals__["DATABASE"] = self.temp_db.name

        app_module.initialise_database()
        app_module.app.config["TESTING"] = True
        self.client = app_module.app.test_client()

    def tearDown(self):
        app_module.get_connection.__globals__["DATABASE"] = self.original_database
        os.unlink(self.temp_db.name)

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)

    def test_create_and_retrieve_budget(self):
        response = self.client.post(
            "/api/budgets",
            json={
                "category": "Food",
                "month": "2026-10",
                "limit_amount": 300,
            },
        )
        self.assertEqual(response.status_code, 201)

        response = self.client.get("/api/budgets?month=2026-10")
        self.assertEqual(response.status_code, 200)

        budgets = response.get_json()
        self.assertEqual(len(budgets), 1)
        self.assertEqual(budgets[0]["category"], "Food")
        self.assertEqual(budgets[0]["remaining"], 300)

    def test_duplicate_budget_is_rejected(self):
        payload = {
            "category": "Food",
            "month": "2026-10",
            "limit_amount": 300,
        }

        first = self.client.post("/api/budgets", json=payload)
        second = self.client.post("/api/budgets", json=payload)

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 409)

    def test_invalid_budget_limit_is_rejected(self):
        response = self.client.post(
            "/api/budgets",
            json={
                "category": "Food",
                "month": "2026-10",
                "limit_amount": -10,
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_update_and_delete_budget(self):
        created = self.client.post(
            "/api/budgets",
            json={
                "category": "Food",
                "month": "2026-10",
                "limit_amount": 300,
            },
        )
        self.assertEqual(created.status_code, 201)
        budget_id = created.get_json()["id"]

        updated = self.client.put(
            f"/api/budgets/{budget_id}",
            json={
                "category": "Food",
                "month": "2026-10",
                "limit_amount": 250,
            },
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()["limit_amount"], 250)

        deleted = self.client.delete(f"/api/budgets/{budget_id}")
        self.assertEqual(deleted.status_code, 200)

        retrieved = self.client.get("/api/budgets?month=2026-10")
        self.assertEqual(retrieved.get_json(), [])

    def test_expense_increases_budget_spending(self):
        self.client.post(
            "/api/budgets",
            json={
                "category": "Food",
                "month": "2026-10",
                "limit_amount": 300,
            },
        )

        response = self.client.post(
            "/api/transactions",
            json={
                "description": "Groceries",
                "amount": 25,
                "type": "expense",
                "category": "Food",
                "date": "2026-10-15",
            },
        )
        self.assertEqual(response.status_code, 201)

        response = self.client.get("/api/budgets?month=2026-10")
        budget = response.get_json()[0]

        self.assertEqual(budget["spent"], 25)
        self.assertEqual(budget["remaining"], 275)

    def test_editing_expense_updates_budget_spending(self):
        self.client.post(
            "/api/budgets",
            json={
                "category": "Food",
                "month": "2026-10",
                "limit_amount": 300,
            },
        )

        created = self.client.post(
            "/api/transactions",
            json={
                "description": "Groceries",
                "amount": 25,
                "type": "expense",
                "category": "Food",
                "date": "2026-10-15",
            },
        )
        self.assertEqual(created.status_code, 201)
        transaction_id = created.get_json()["id"]

        updated = self.client.put(
            f"/api/transactions/{transaction_id}",
            json={
                "description": "Groceries",
                "amount": 40,
                "type": "expense",
                "category": "Food",
                "date": "2026-10-15",
            },
        )
        self.assertEqual(updated.status_code, 200)

        response = self.client.get("/api/budgets?month=2026-10")
        budget = response.get_json()[0]

        self.assertEqual(budget["spent"], 40)
        self.assertEqual(budget["remaining"], 260)

    def test_deleting_expense_updates_budget_spending(self):
        self.client.post(
            "/api/budgets",
            json={
                "category": "Food",
                "month": "2026-10",
                "limit_amount": 300,
            },
        )

        created = self.client.post(
            "/api/transactions",
            json={
                "description": "Groceries",
                "amount": 25,
                "type": "expense",
                "category": "Food",
                "date": "2026-10-15",
            },
        )
        self.assertEqual(created.status_code, 201)
        transaction_id = created.get_json()["id"]

        deleted = self.client.delete(
            f"/api/transactions/{transaction_id}"
        )
        self.assertEqual(deleted.status_code, 200)

        response = self.client.get("/api/budgets?month=2026-10")
        budget = response.get_json()[0]

        self.assertEqual(budget["spent"], 0)
        self.assertEqual(budget["remaining"], 300)


if __name__ == "__main__":
    unittest.main()
