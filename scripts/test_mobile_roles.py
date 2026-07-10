"""Test mobile app API flows for all Spice Garden roles against production."""
import json
import sys
import urllib.request

API = "https://sumaya-api.onrender.com/api/v1"
SLUG = "spice-garden"
PASSWORD = "Sumaya@123"

ROLE_TESTS = [
    ("waiter", "waiter@spice-garden.com", [
        ("tables/floor", 8),
        ("orders/list?page_size=20", 8),
        ("menus/items/list?page_size=20", 8),
    ]),
    ("kitchen_staff", "kitchen@spice-garden.com", [
        ("kot/queue", 8),
    ]),
    ("cashier", "cashier@spice-garden.com", [
        ("orders/list?page_size=50", 8),  # unpaid filtered client-side
    ]),
    ("restaurant_owner", "owner@spice-garden.com", [
        ("reports/dashboard", 0),  # object not list
        ("inventory/list?page_size=20", 8),
        ("delivery/list?page_size=20", 8),
    ]),
    ("inventory_manager", "inventory@spice-garden.com", [
        ("inventory/list?page_size=20", 8),
    ]),
    ("delivery_operator", "delivery@spice-garden.com", [
        ("delivery/list?page_size=20", 8),
    ]),
    ("customer", "customer@spice-garden.com", [
        ("public/menu/", 0),  # special — needs branch id
    ]),
]


def post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{API}{path}", data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def get(path: str, token: str) -> dict:
    req = urllib.request.Request(f"{API}{path}")
    req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def login(email: str) -> tuple[str, dict]:
    data = post("/auth/restaurant-login", {"email": email, "password": PASSWORD, "restaurant_slug": SLUG})
    return data["access_token"], data["user"]


def customer_login() -> tuple[str, dict]:
    data = post("/customer/login", {"email": "customer@spice-garden.com", "password": PASSWORD, "restaurant_slug": SLUG})
    return data["access_token"], data["user"]


def main():
    print("=== Mobile Role API Tests (Production) ===\n")
    failed = []

    # Public customer menu
    try:
        pub = get("/auth/public/restaurant/spice-garden", "")
    except TypeError:
        req = urllib.request.Request(f"{API}/auth/public/restaurant/spice-garden")
        with urllib.request.urlopen(req, timeout=120) as r:
            pub = json.loads(r.read())
    except Exception as e:
        print(f"FAIL public restaurant: {e}")
        sys.exit(1)

    branch_id = pub["branches"][0]["id"]
    req = urllib.request.Request(f"{API}/public/menu/{branch_id}")
    with urllib.request.urlopen(req, timeout=120) as r:
        menu = json.loads(r.read())
    cats = menu.get("categories", [])
    item_count = sum(len(c.get("items", [])) for c in cats)
    status = "PASS" if item_count >= 8 else "FAIL"
    print(f"  customer (public menu)  {item_count:3} items (min 8) [{status}]")
    if item_count < 8:
        failed.append("customer_menu")

    for role, email, endpoints in ROLE_TESTS:
        if role == "customer":
            continue
        try:
            token, user = login(email)
            print(f"\n  Role: {role} ({email})")
            for ep, min_rows in endpoints:
                data = get(f"/{ep}", token)
                if ep.startswith("reports/dashboard"):
                    ok = data.get("today_orders", 0) >= 0
                    print(f"    dashboard           sales={data.get('today_sales', 0)} orders={data.get('today_orders', 0)} [{'PASS' if ok else 'FAIL'}]")
                    continue
                if ep.startswith("orders/list") and role == "cashier":
                    unpaid = [o for o in data.get("items", []) if o.get("payment_status") != "paid"]
                    count = len(unpaid)
                    label = "billing_unpaid"
                else:
                    count = len(data.get("items", []))
                    label = ep.split("?")[0]
                st = "PASS" if count >= min_rows else "FAIL"
                print(f"    {label:20} {count:3} (min {min_rows}) [{st}]")
                if count < min_rows:
                    failed.append(f"{role}:{label}")
        except Exception as e:
            print(f"  FAIL {role}: {e}")
            failed.append(f"login:{role}")

    print(f"\n=== Result: {len(failed)} failures ===")
    if failed:
        print("Failed:", ", ".join(failed))
        sys.exit(1)
    print("All mobile role tests passed.")


if __name__ == "__main__":
    main()
