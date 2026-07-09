"""Seed database with demo tenants from requirement pack."""
import asyncio

from sqlalchemy import select, text

from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import hash_password
from app.models import (
    Branch,
    Coupon,
    Customer,
    Floor,
    Ingredient,
    MenuCategory,
    MenuItem,
    Restaurant,
    SubscriptionPlan,
    Table,
    TableQrCode,
    Tenant,
    User,
)

DEMO_DATA = [
    {
        "tenant": {"slug": "spice-garden", "name": "Spice Garden", "brand_style": "Indian warm fine-dine"},
        "restaurant": {"name": "Spice Garden", "slug": "spice-garden", "cuisine_type": "Indian"},
        "branches": [
            {"code": "BR-001", "name": "CG Road", "city": "Ahmedabad", "tables": 18,
             "menu": ["Paneer Tikka", "Dal Makhani", "Butter Naan", "Lassi"]},
            {"code": "BR-002", "name": "Prahladnagar", "city": "Ahmedabad", "tables": 22,
             "menu": ["Thali", "Biryani", "Chaat", "Kulfi"]},
        ],
    },
    {
        "tenant": {"slug": "urban-bowl", "name": "Urban Bowl Cafe", "brand_style": "Modern cafe theme"},
        "restaurant": {"name": "Urban Bowl Cafe", "slug": "urban-bowl", "cuisine_type": "Cafe"},
        "branches": [
            {"code": "BR-003", "name": "Magarpatta", "city": "Pune", "tables": 14,
             "menu": ["Coffee", "Pasta", "Sandwich", "Brownie"]},
        ],
    },
    {
        "tenant": {"slug": "coastal-curry", "name": "Coastal Curry House", "brand_style": "Seafood coastal theme"},
        "restaurant": {"name": "Coastal Curry House", "slug": "coastal-curry", "cuisine_type": "Seafood"},
        "branches": [
            {"code": "BR-004", "name": "Bandra", "city": "Mumbai", "tables": 20, "delivery_enabled": True,
             "menu": ["Fish Curry", "Appam", "Prawns Fry"]},
        ],
    },
]

MENU_PRICES = {
    "Paneer Tikka": 280, "Dal Makhani": 220, "Butter Naan": 60, "Lassi": 80,
    "Thali": 350, "Biryani": 320, "Chaat": 120, "Kulfi": 90,
    "Coffee": 150, "Pasta": 280, "Sandwich": 200, "Brownie": 120,
    "Fish Curry": 380, "Appam": 40, "Prawns Fry": 420,
}

STAFF_USERS = [
    ("admin@sumayaresto.com", "Super Admin", "super_admin", None, None),
    ("owner@spice-garden.com", "Raj Patel", "restaurant_owner", "spice-garden", None),
    ("manager@spice-garden.com", "Priya Shah", "branch_manager", "spice-garden", "BR-001"),
    ("waiter@spice-garden.com", "Amit Kumar", "waiter", "spice-garden", "BR-001"),
    ("kitchen@spice-garden.com", "Suresh Mehta", "kitchen_staff", "spice-garden", "BR-001"),
    ("cashier@spice-garden.com", "Neha Desai", "cashier", "spice-garden", "BR-001"),
    ("inventory@spice-garden.com", "Vikram Joshi", "inventory_manager", "spice-garden", "BR-001"),
    ("supplier@spice-garden.com", "Kiran Rao", "supplier_manager", "spice-garden", "BR-001"),
    ("delivery@spice-garden.com", "Ravi Singh", "delivery_operator", "spice-garden", "BR-001"),
    ("customer@spice-garden.com", "Demo Customer", "customer", "spice-garden", "BR-001"),
    ("owner@urban-bowl.com", "Anita Desai", "restaurant_owner", "urban-bowl", None),
    ("waiter@urban-bowl.com", "Rohan Mehta", "waiter", "urban-bowl", "BR-003"),
    ("kitchen@urban-bowl.com", "Priya Nair", "kitchen_staff", "urban-bowl", "BR-003"),
    ("cashier@urban-bowl.com", "Sneha Patil", "cashier", "urban-bowl", "BR-003"),
    ("customer@urban-bowl.com", "Cafe Customer", "customer", "urban-bowl", "BR-003"),
    ("owner@coastal-curry.com", "Arjun Menon", "restaurant_owner", "coastal-curry", None),
    ("waiter@coastal-curry.com", "Deepa Iyer", "waiter", "coastal-curry", "BR-004"),
    ("kitchen@coastal-curry.com", "Manoj Pillai", "kitchen_staff", "coastal-curry", "BR-004"),
    ("cashier@coastal-curry.com", "Lakshmi Nair", "cashier", "coastal-curry", "BR-004"),
    ("customer@coastal-curry.com", "Seafood Lover", "customer", "coastal-curry", "BR-004"),
]


async def seed(force: bool = False):
    async with engine.begin() as conn:
        if force:
            await conn.execute(text("DROP SCHEMA public CASCADE"))
            await conn.execute(text("CREATE SCHEMA public"))
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(Tenant).limit(1))
        if existing.scalar_one_or_none() and not force:
            print("Database already seeded. Use seed(force=True) to reset.")
            return

        plan = SubscriptionPlan(
            name="Professional", code="pro", price_monthly=2999.0,
            features={"branches": 5, "staff": 50, "analytics": True}, max_branches=5,
        )
        db.add(plan)
        await db.flush()

        slug_to_ids: dict[str, dict] = {}
        menu_items_by_branch: dict = {}
        tables_by_branch: dict = {}

        for demo in DEMO_DATA:
            t = demo["tenant"]
            tenant = Tenant(
                name=t["name"], slug=t["slug"], brand_style=t["brand_style"],
                primary_color="#F59E0B", secondary_color="#DC2626", subscription_plan="pro",
            )
            db.add(tenant)
            await db.flush()

            r = demo["restaurant"]
            restaurant = Restaurant(
                tenant_id=tenant.id, name=r["name"], slug=r["slug"],
                cuisine_type=r["cuisine_type"], restaurant_id=tenant.id,
                gstin="24AABCU9603R1ZM", fssai_number="10018047000001",
            )
            db.add(restaurant)
            await db.flush()
            slug_to_ids[t["slug"]] = {"tenant_id": tenant.id, "restaurant_id": restaurant.id, "branches": {}}

            for bdata in demo["branches"]:
                branch = Branch(
                    restaurant_id=restaurant.id, name=bdata["name"], code=bdata["code"],
                    city=bdata["city"], address=f"{bdata['name']}, {bdata['city']}",
                    phone="+91-9876543210", tax_rate=5.0,
                    delivery_enabled=bdata.get("delivery_enabled", False),
                )
                db.add(branch)
                await db.flush()
                slug_to_ids[t["slug"]]["branches"][bdata["code"]] = branch.id

                floor = Floor(restaurant_id=restaurant.id, branch_id=branch.id, name="Ground Floor")
                db.add(floor)
                await db.flush()

                for i in range(1, bdata["tables"] + 1):
                    table = Table(
                        restaurant_id=restaurant.id, branch_id=branch.id, floor_id=floor.id,
                        table_number=str(i), capacity=4 if i % 3 else 6, table_status="available",
                    )
                    db.add(table)
                    await db.flush()
                    db.add(TableQrCode(
                        restaurant_id=restaurant.id, branch_id=branch.id, table_id=table.id,
                        qr_token=f"qr-{branch.code}-t{i}",
                        qr_url=f"/r/{t['slug']}/customer/login?table={table.id}",
                    ))

                cat = MenuCategory(
                    restaurant_id=restaurant.id, branch_id=branch.id,
                    name="Chef Specials", description="House favorites", sort_order=1,
                )
                db.add(cat)
                await db.flush()

                for item_name in bdata["menu"]:
                    db.add(MenuItem(
                        restaurant_id=restaurant.id, branch_id=branch.id, category_id=cat.id,
                        name=item_name, description=f"Freshly prepared {item_name}",
                        price=MENU_PRICES.get(item_name, 200),
                        is_veg=item_name not in ("Fish Curry", "Prawns Fry"), kitchen_station="main",
                    ))
                await db.flush()
                mi = await db.execute(select(MenuItem).where(MenuItem.branch_id == branch.id))
                menu_items_by_branch[branch.id] = list(mi.scalars().all())
                tb = await db.execute(select(Table).where(Table.branch_id == branch.id).limit(20))
                tables_by_branch[branch.id] = list(tb.scalars().all())

                for ing_name in ["Rice", "Oil", "Spices", "Vegetables"]:
                    db.add(Ingredient(
                        restaurant_id=restaurant.id, branch_id=branch.id, name=ing_name,
                        unit="kg", current_stock=50.0, reorder_level=10.0, cost_per_unit=80.0,
                    ))

                db.add(Coupon(
                    restaurant_id=restaurant.id, branch_id=branch.id,
                    code=f"WELCOME10-{bdata['code']}", discount_type="percent",
                    discount_value=10.0, min_order_amount=200.0, max_uses=1000,
                ))

        for email, name, role, slug, branch_code in STAFF_USERS:
            restaurant_id = slug_to_ids[slug]["restaurant_id"] if slug else None
            branch_id = slug_to_ids[slug]["branches"].get(branch_code) if slug and branch_code else None
            db.add(User(
                email=email, password_hash=hash_password("Sumaya@123"),
                full_name=name, role=role, restaurant_id=restaurant_id, branch_id=branch_id,
                phone="+91-9876543210" if role == "customer" else None,
            ))
            if role == "customer" and slug:
                await db.flush()
                db.add(Customer(
                    full_name=name, email=email, phone="+91-9876543210",
                    loyalty_points=100, tier="bronze",
                    restaurant_id=restaurant_id, branch_id=branch_id,
                ))

        from seed_bulk import seed_bulk_data
        await seed_bulk_data(db, slug_to_ids, menu_items_by_branch, tables_by_branch)

        await db.commit()
        print("Database seeded successfully!")
        print("\n=== Demo Logins (password: Sumaya@123) ===")
        for email, name, role, slug, _ in STAFF_USERS:
            print(f"  {role:22} {email}")


if __name__ == "__main__":
    import sys
    asyncio.run(seed(force="--force" in sys.argv))
