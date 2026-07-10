"""Verify Spice Garden demo data on production — 8+ rows per module."""
import json
import sys
import urllib.request

API = "https://sumaya-api.onrender.com/api/v1"
SLUG = "spice-garden"
PASSWORD = "Sumaya@123"

MODULES = [
    ("orders", "/orders/list", 8),
    ("kitchen_kots", "/kot/queue", 8),
    ("inventory", "/inventory/list", 8),
    ("delivery", "/delivery/list", 8),
    ("reservations", "/reservations/list", 8),
    ("waitlist", "/waitlist/list", 8),
    ("suppliers", "/suppliers/list", 8),
    ("customers", "/customers/list", 8),
    ("menus/items", "/menus/items/list", 8),
    ("tables", "/tables/list", 8),
    ("finance", "/finance/list", 8),
    ("purchase_orders", "/purchase-orders/list", 8),
    ("riders", "/delivery/riders/list", 8),
    ("notifications", "/notifications/list", 8),
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
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def get(path: str, token: str) -> dict:
    req = urllib.request.Request(f"{API}{path}")
    req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def login(email: str) -> str:
    data = post("/auth/restaurant-login", {"email": email, "password": PASSWORD, "restaurant_slug": SLUG})
    return data["access_token"]


def main():
    print("=== Spice Garden Production Verification ===\n")
    token = login("owner@spice-garden.com")
    failed = []
    passed = []

    for name, path, min_rows in MODULES:
        try:
            data = get(f"{path}?page_size=50", token)
            items = data.get("items", data if isinstance(data, list) else [])
            count = len(items)
            if name == "kitchen_kots":
                unpaid = get("/orders/list?page_size=50", token)
                unpaid_count = sum(1 for o in unpaid.get("items", []) if o.get("payment_status") != "paid")
                status = "PASS" if count >= min_rows else "FAIL"
                line = f"  {name:20} {count:3} rows (min {min_rows}) [{status}]"
                print(line)
                print(f"  {'billing_unpaid':20} {unpaid_count:3} rows (min 8) [{'PASS' if unpaid_count >= 8 else 'FAIL'}]")
                if count < min_rows:
                    failed.append(name)
                else:
                    passed.append(name)
                if unpaid_count < 8:
                    failed.append("billing_unpaid")
                continue
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
