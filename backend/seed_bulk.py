"""Seed 9-10 demo records per module for Spice Garden (primary branch)."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select

from seed_branding import RESTAURANT_BRANDING

from app.models import (
    AuditLog,
    CashDrawer,
    CmsContent,
    Combo,
    Customer,
    CustomerAddress,
    DayClose,
    DeliveryOrder,
    DeviceSession,
    FinanceEntry,
    Ingredient,
    Integration,
    ItemVariant,
    KotTicket,
    LoyaltyTransaction,
    MenuItem,
    Modifier,
    Notification,
    OrderHeader,
    OrderLine,
    Payment,
    Permission,
    PrinterJob,
    PurchaseOrder,
    PurchaseOrderLine,
    Recipe,
    Reservation,
    Rider,
    Role,
    StaffShift,
    StockLedger,
    StockTransfer,
    Supplier,
    Table,
    TenantInvoice,
    User,
    WaitlistEntry,
    Wastage,
    WebhookEndpoint,
)


async def seed_bulk_data(db, slug_to_ids: dict, menu_items_by_branch: dict, tables_by_branch: dict):
    """Populate operational demo data after base seed."""
    sg = slug_to_ids["spice-garden"]
    rid = sg["restaurant_id"]
    bid = sg["branches"]["BR-001"]
    tenant_id = sg["tenant_id"]

    users_result = await db.execute(
        select(User).where(User.restaurant_id == rid, User.branch_id == bid)
    )
    users = {u.role: u for u in users_result.scalars().all()}
    waiter = users.get("waiter")
    kitchen = users.get("kitchen_staff")
    cashier = users.get("cashier")

    cust_result = await db.execute(select(Customer).where(Customer.restaurant_id == rid).limit(10))
    customers = list(cust_result.scalars().all())

    menu_items = menu_items_by_branch.get(bid, [])
    tables = tables_by_branch.get(bid, [])

    now = datetime.now(timezone.utc)

    # Roles & permissions (10)
    role_defs = [
        ("Waiter", "waiter", "Front-of-house service"),
        ("Kitchen", "kitchen_staff", "Kitchen operations"),
        ("Cashier", "cashier", "Billing and payments"),
        ("Manager", "branch_manager", "Branch management"),
        ("Inventory", "inventory_manager", "Stock control"),
        ("Delivery", "delivery_operator", "Delivery dispatch"),
        ("Supplier", "supplier_manager", "Vendor management"),
        ("Host", "host", "Guest reception"),
        ("Bar", "bar_staff", "Beverage station"),
        ("Support", "support_admin", "Platform support"),
    ]
    for name, code, desc in role_defs:
        db.add(Role(restaurant_id=rid, branch_id=bid, name=name, code=code, description=desc, permissions={"modules": [code]}))

    perm_actions = ["create", "read", "update", "delete", "export", "approve", "void", "assign", "dispatch", "report"]
    for i, action in enumerate(perm_actions):
        db.add(Permission(restaurant_id=rid, module="orders", action=action, code=f"orders.{action}"))

    # Staff shifts (10)
    for i in range(10):
        uid = [waiter, kitchen, cashier][i % 3]
        if uid:
            db.add(StaffShift(
                restaurant_id=rid, branch_id=bid, user_id=uid.id,
                shift_start=now - timedelta(hours=8 - i),
                shift_end=now + timedelta(hours=4 + i) if i < 5 else None,
                notes=f"Shift slot {i + 1}",
            ))

    # Suppliers (10)
    catalog = RESTAURANT_BRANDING.get("spice-garden", {}).get("supplier_catalog", [])
    suppliers = []
    for i in range(1, 11):
        supply_desc = catalog[i % len(catalog)] if catalog else f"General F&B supplies batch {i}"
        s = Supplier(
            restaurant_id=rid, branch_id=bid,
            name=f"Supplier {i} Foods Pvt Ltd",
            contact_person=f"Contact Person {i}",
            phone=f"+91-98{i:08d}",
            email=f"supplier{i}@demo.com",
            address=f"Industrial Area {i}, Ahmedabad — Supplies: {supply_desc}",
            payment_terms="Net 30" if i % 2 else "COD",
        )
        db.add(s)
        suppliers.append(s)
    await db.flush()

    # Ingredients extended + stock ledger (10 ledger entries)
    ing_result = await db.execute(select(Ingredient).where(Ingredient.branch_id == bid))
    ingredients = list(ing_result.scalars().all())
    for i in range(10):
        if ingredients:
            ing = ingredients[i % len(ingredients)]
            db.add(StockLedger(
                restaurant_id=rid, branch_id=bid, ingredient_id=ing.id,
                movement_type=["purchase", "consumption", "adjustment"][i % 3],
                quantity=5.0 + i, reference_type="seed", notes=f"Stock movement {i + 1}",
            ))

    # Purchase orders (10)
    for i in range(1, 11):
        po = PurchaseOrder(
            restaurant_id=rid, branch_id=bid, supplier_id=suppliers[i % len(suppliers)].id,
            po_number=f"PO-2026-{i:04d}", total_amount=5000 + i * 500,
            po_status=["draft", "sent", "received", "cancelled"][i % 4],
            expected_date=now + timedelta(days=i),
        )
        db.add(po)
        await db.flush()
        if ingredients:
            ing = ingredients[i % len(ingredients)]
            db.add(PurchaseOrderLine(
                restaurant_id=rid, branch_id=bid, purchase_order_id=po.id,
                ingredient_id=ing.id, quantity=10 + i, unit_price=50.0, line_total=(10 + i) * 50,
            ))

    # Menu variants & modifiers (10 each)
    if menu_items:
        for i, item in enumerate(menu_items[:10]):
            db.add(ItemVariant(restaurant_id=rid, branch_id=bid, menu_item_id=item.id, name="Large", price_delta=40 + i * 5))
            db.add(Modifier(restaurant_id=rid, branch_id=bid, menu_item_id=item.id, name=f"Extra Spice {i + 1}", price=20 + i * 2, modifier_group="addons"))
            db.add(Recipe(
                restaurant_id=rid, branch_id=bid, menu_item_id=item.id,
                name=f"Recipe for {item.name}", yield_qty=1.0,
                ingredients={"base": item.name, "qty": "1 portion"},
            ))

    # Combos (10)
    for i in range(1, 11):
        db.add(Combo(
            restaurant_id=rid, branch_id=bid,
            name=f"Combo Meal {i}", description=f"Value combo #{i}",
            price=299 + i * 20, items={"items": [f"item_{i}", f"drink_{i}"]},
        ))

    # Sample orders with KOTs in various statuses (10)
    order_statuses = ["confirmed", "preparing", "ready", "served", "completed"] * 2
    kot_statuses = ["queued", "preparing", "ready", "served", "served"] * 2
    for i in range(10):
        if not menu_items:
            break
        item = menu_items[i % len(menu_items)]
        table = tables[i % len(tables)] if tables else None
        gross = item.price * (i % 3 + 1)
        tax = gross * 0.05
        order = OrderHeader(
            restaurant_id=rid, branch_id=bid,
            order_number=f"ORD-DEMO-{i + 1:04d}",
            order_type=["dine_in", "takeaway", "delivery"][i % 3],
            table_id=table.id if table and i % 3 == 0 else None,
            customer_id=customers[i % len(customers)].id if customers else None,
            waiter_id=waiter.id if waiter else None,
            order_status=order_statuses[i],
            gross_amount=gross, discount_amount=0, tax_amount=tax, net_amount=gross + tax,
            payment_status="paid" if order_statuses[i] == "completed" else "unpaid",
            notes=f"Demo order {i + 1}",
        )
        db.add(order)
        await db.flush()
        db.add(OrderLine(
            restaurant_id=rid, branch_id=bid, order_id=order.id,
            menu_item_id=item.id, item_name=item.name, quantity=i % 3 + 1,
            unit_price=item.price, line_total=gross,
            line_status=kot_statuses[i] if kot_statuses[i] != "queued" else "pending",
        ))
        db.add(KotTicket(
            restaurant_id=rid, branch_id=bid, order_id=order.id,
            kot_number=f"KOT-DEMO-{i + 1:04d}",
            kot_status=kot_statuses[i], kitchen_station="main", priority=i % 3,
            fired_at=now - timedelta(minutes=30 - i * 2),
            completed_at=now if kot_statuses[i] == "served" else None,
        ))
        if order_statuses[i] == "completed":
            db.add(Payment(
                restaurant_id=rid, branch_id=bid, order_id=order.id,
                amount=order.net_amount, payment_method=["cash", "upi", "card"][i % 3],
                payment_status="completed", transaction_id=f"TXN-{i + 1:06d}",
            ))

    # Reservations (10)
    for i in range(1, 11):
        db.add(Reservation(
            restaurant_id=rid, branch_id=bid,
            guest_name=f"Guest {i}", guest_phone=f"+91-90{i:08d}",
            guest_count=2 + (i % 4), reserved_at=now + timedelta(hours=i * 2),
            event_type=["dinner", "birthday", "anniversary", "business"][i % 4],
            reservation_status=["confirmed", "confirmed", "seated", "cancelled"][i % 4],
            table_id=tables[i % len(tables)].id if tables and i % 4 == 2 else None,
            notes=f"Reservation note {i}",
        ))

    # Waitlist (10)
    for i in range(1, 11):
        db.add(WaitlistEntry(
            restaurant_id=rid, branch_id=bid,
            guest_name=f"Walk-in Guest {i}", guest_phone=f"+91-91{i:08d}",
            party_size=2 + (i % 3), queue_number=i,
            waitlist_status=["waiting", "waiting", "called", "seated", "cancelled"][i % 5],
            estimated_wait_mins=10 + i * 3,
            called_at=now if i % 5 == 2 else None,
            seated_at=now if i % 5 == 3 else None,
        ))

    # Riders & delivery (10 riders, 10 deliveries from delivery orders)
    riders = []
    for i in range(1, 11):
        r = Rider(restaurant_id=rid, branch_id=bid, name=f"Rider {i}", phone=f"+91-92{i:08d}", vehicle_type=["bike", "scooter"][i % 2], is_available=i % 3 != 0)
        db.add(r)
        riders.append(r)
    await db.flush()

    delivery_orders_result = await db.execute(
        select(OrderHeader).where(OrderHeader.branch_id == bid, OrderHeader.order_type == "delivery").limit(10)
    )
    for i, order in enumerate(delivery_orders_result.scalars().all()):
        db.add(DeliveryOrder(
            restaurant_id=rid, branch_id=bid, order_id=order.id,
            rider_id=riders[i % len(riders)].id,
            delivery_status=["pending", "picked_up", "in_transit", "delivered"][i % 4],
            estimated_time=now + timedelta(minutes=30 + i * 5),
            delivered_at=now if i % 4 == 3 else None,
        ))

    # Loyalty (10)
    for i, c in enumerate(customers[:10]):
        db.add(LoyaltyTransaction(
            restaurant_id=rid, branch_id=bid, customer_id=c.id,
            points=50 + i * 10, transaction_type=["earn", "redeem", "bonus"][i % 3],
            notes=f"Loyalty txn {i + 1}",
        ))

    # Finance & day close (10 each)
    for i in range(1, 11):
        db.add(FinanceEntry(
            restaurant_id=rid, branch_id=bid,
            entry_type=["income", "expense"][i % 2],
            category=["sales", "utilities", "supplies", "salary"][i % 4],
            amount=1000 + i * 250, description=f"Finance entry {i}",
            entry_date=now - timedelta(days=i),
        ))
        db.add(DayClose(
            restaurant_id=rid, branch_id=bid,
            close_date=now - timedelta(days=i),
            total_sales=15000 + i * 1000, total_orders=40 + i * 3,
            cash_total=5000 + i * 200, upi_total=6000 + i * 300, card_total=4000 + i * 100,
            notes=f"Day close {i}",
        ))

    # Cash drawers (10)
    for i in range(10):
        if cashier:
            db.add(CashDrawer(
                restaurant_id=rid, branch_id=bid, user_id=cashier.id,
                opening_balance=2000 + i * 100,
                closing_balance=5000 + i * 200 if i % 2 else None,
                opened_at=now - timedelta(hours=10 - i),
                closed_at=now - timedelta(hours=2) if i % 2 else None,
                drawer_status="closed" if i % 2 else "open",
            ))

    # CMS (10)
    for i in range(1, 11):
        db.add(CmsContent(
            restaurant_id=rid, branch_id=bid,
            page_key=f"page_{i}", title=f"Content Page {i}",
            body=f"<p>Demo CMS content block {i} for Spice Garden.</p>",
            content_type=["page", "banner", "faq"][i % 3], is_published=True,
        ))

    # Integrations & webhooks (10)
    providers = ["razorpay", "stripe", "twilio", "sendgrid", "whatsapp", "zomato", "swiggy", "petpooja", "tally", "google"]
    for i, prov in enumerate(providers):
        db.add(Integration(
            restaurant_id=rid, branch_id=bid,
            provider=prov, integration_type=["payment", "sms", "delivery", "accounting"][i % 4],
            config={"enabled": i % 2 == 0}, is_enabled=i % 2 == 0,
        ))
        db.add(WebhookEndpoint(
            restaurant_id=rid, branch_id=bid,
            url=f"https://api.example.com/webhooks/{prov}",
            events={"order.created": True, "payment.completed": True},
            secret=f"whsec_{uuid4().hex[:16]}", is_active=True,
        ))

    # Notifications (10 sample)
    notif_events = [
        ("New order", "ORD-DEMO-0001 placed", "order_placed"),
        ("In preparation", "Kitchen started order", "preparing"),
        ("Ready to serve", "Order ready at pass", "ready"),
        ("Table ready", "Queue #3 called", "waitlist_called"),
        ("Reservation", "Guest arriving at 7 PM", "reservation_booked"),
        ("Delivery dispatched", "Rider picked up order", "delivered"),
        ("Low stock", "Rice below reorder level", "inventory_alert"),
        ("Payment received", "UPI payment confirmed", "payment"),
        ("Order served", "Table 5 served", "served"),
        ("Day closed", "Shift closed successfully", "day_close"),
    ]
    for title, msg, evt in notif_events:
        uid = waiter.id if waiter else None
        db.add(Notification(
            restaurant_id=rid, branch_id=bid, user_id=uid,
            title=title, message=msg, channel="in_app",
            event_type=evt, is_read=False,
        ))

    # Device sessions & printer jobs (10)
    for i in range(10):
        if waiter:
            db.add(DeviceSession(
                restaurant_id=rid, branch_id=bid, user_id=waiter.id,
                device_type=["pos", "tablet", "kds"][i % 3],
                device_name=f"Device-{i + 1}", is_online=i % 3 != 0,
            ))
        db.add(PrinterJob(
            restaurant_id=rid, branch_id=bid,
            job_type=["kot", "bill", "report"][i % 3],
            content=f"Print job content {i + 1}",
            job_status=["queued", "printed", "failed"][i % 3],
            printer_name=f"Printer-{i % 3 + 1}",
        ))

    # Audit logs (10)
    for i in range(10):
        db.add(AuditLog(
            restaurant_id=rid, branch_id=bid,
            user_id=waiter.id if waiter else None,
            action=["create", "update", "delete", "login"][i % 4],
            entity_type=["order", "table", "payment", "reservation"][i % 4],
            entity_id=uuid4(), ip_address=f"192.168.1.{i + 10}",
        ))

    # Stock transfer & wastage (10)
    if ingredients and len(ingredients) >= 2:
        for i in range(10):
            db.add(StockTransfer(
                restaurant_id=rid, branch_id=bid,
                from_branch_id=bid, to_branch_id=bid,
                ingredient_id=ingredients[i % len(ingredients)].id,
                quantity=2.0 + i, transfer_status=["pending", "completed"][i % 2],
            ))
            db.add(Wastage(
                restaurant_id=rid, branch_id=bid,
                ingredient_id=ingredients[i % len(ingredients)].id,
                quantity=0.5 + i * 0.1, reason=["expired", "spillage", "prep_loss"][i % 3],
            ))

    # Customer addresses (10)
    for i, c in enumerate(customers[:10]):
        db.add(CustomerAddress(
            restaurant_id=rid, branch_id=bid, customer_id=c.id,
            label=["home", "work", "other"][i % 3],
            address_line=f"{100 + i} Demo Street, Ahmedabad", city="Ahmedabad",
            pincode=f"38000{i}", is_default=i == 0,
        ))

    # Tenant invoices (10)
    for i in range(1, 11):
        db.add(TenantInvoice(
            restaurant_id=rid, branch_id=bid, tenant_id=tenant_id,
            invoice_number=f"INV-2026-{i:04d}", amount=2999 + i * 100,
            invoice_status=["pending", "paid", "overdue"][i % 3],
            due_date=now + timedelta(days=i * 7),
            paid_at=now if i % 3 == 1 else None,
        ))

    await db.flush()
    print("Bulk demo data seeded (9-10 records per module).")
