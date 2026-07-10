"""Verify Spice Garden demo data on production — 8+ rows per module."""
import json
import os
import sys
import urllib.request

API = os.environ.get("VERIFY_API", "https://sumaya-api.onrender.com/api/v1")
SLUG = "spice-garden"
PASSWORD = "Sumaya@123"

MODULES = [
    ("orders", "/orders/list", 8, "owner"),
    ("kitchen_kots", "/kot/queue", 8, "kitchen"),
    ("billing_unpaid", "/orders/list", 8, "owner", True),
    ("inventory", "/inventory/list", 8, "owner"),
    ("delivery", "/delivery/list", 8, "owner"),
    ("reservations", "/reservations/list", 8, "owner"),
    ("waitlist", "/waitlist/queue", 8, "manager"),
    ("suppliers", "/suppliers/list", 8, "owner"),
    ("customers", "/customers/list", 8, "owner"),
    ("menus/items", "/menus/items/list", 8, "owner"),
    ("tables", "/tables/list", 8, "owner"),
    ("finance", "/finance/list", 8, "owner"),
    ("purchase_orders", "/suppliers/purchase-orders/list", 8, "owner"),
    ("riders", "/delivery/riders/list", 8, "owner"),
    ("notifications", "/notifications/list", 8, "owner"),
]

ROLES = [
    ("waiter", "waiter@spice-garden.com"),
    ("kitchen", "kitchen@spice-garden.com"),
    ("cashier", "cashier@spice-garden.com"),
    ("owner", "owner@spice-garden.com"),
    ("inventory", "inventory@spice-garden.com"),
    ("delivery", "delivery@spice-garden.com"),
]


def post(path: str, body: dict, token: str | None = None) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{API}{path}", data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def get(path: str, token: str) -> dict:
    req = urllib.request.Request(f"{API}{path}")
    req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def login(email: str) -> str:
    data = post("/auth/restaurant-login", {"email": email, "password": PASSWORD, "restaurant_slug": SLUG})
    return data["access_token"]


def main():
    print("=== Spice Garden Module Verification ===\n")
    tokens = {
        "owner": login("owner@spice-garden.com"),
        "kitchen": login("kitchen@spice-garden.com"),
        "manager": login("manager@spice-garden.com"),
    }
    failed = []
    passed = []

    for entry in MODULES:
        name, path, min_rows, role, *extra = (*entry, "owner")[:5]
        unpaid_filter = bool(extra and extra[0])
        try:
            data = get(f"{path}?page_size=50", tokens[role])
            items = data.get("items", [])
            if unpaid_filter:
                items = [o for o in items if o.get("payment_status") != "paid"]
            count = len(items)
            status = "PASS" if count >= min_rows else "FAIL"
            print(f"  {name:20} {count:3} rows (min {min_rows}) [{status}]")
            (passed if count >= min_rows else failed).append(name)
        except Exception as e:
            print(f"  {name:20} ERR  [{e}]")
            failed.append(name)

    print("\n=== Role login smoke test ===")
    for role, email in ROLES:
        try:
            t = login(email)
            kots = get("/kot/queue", t) if role == "kitchen" else {"items": []}
            tables = get("/tables/floor", t) if role in ("waiter", "cashier") else {"items": []}
            extra = ""
            if role == "kitchen":
                extra = f" kots={len(kots.get('items', []))}"
            if role in ("waiter", "cashier"):
                extra = f" tables={len(tables.get('items', []))}"
            print(f"  {role:12} {email:30} PASS{extra}")
            passed.append(f"login:{role}")
        except Exception as e:
            print(f"  {role:12} {email:30} FAIL [{e}]")
            failed.append(f"login:{role}")

    print(f"\n=== Summary: {len(passed)} passed, {len(failed)} failed ===")
    if failed:
        print("Failed:", ", ".join(failed))
        sys.exit(1)
    print("All checks passed.")


if __name__ == "__main__":
    main()
