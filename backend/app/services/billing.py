"""Unified billing: coupons, loyalty, GST (CGST/SGST), service charge."""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Branch, Coupon, Customer, MenuItem, Restaurant


@dataclass
class LineInput:
    menu_item_id: UUID
    quantity: int = 1
    unit_price: float | None = None
    modifiers: dict | None = None
    notes: str | None = None


@dataclass
class BillResult:
    gross_amount: float = 0.0
    discount_amount: float = 0.0
    loyalty_discount: float = 0.0
    service_charge_amount: float = 0.0
    taxable_amount: float = 0.0
    cgst_amount: float = 0.0
    sgst_amount: float = 0.0
    igst_amount: float = 0.0
    tax_amount: float = 0.0
    net_amount: float = 0.0
    coupon_code: str | None = None
    loyalty_points_redeemed: int = 0
    tax_breakdown: dict = field(default_factory=dict)
    lines: list[dict] = field(default_factory=list)


def _branch_tax_config(branch: Branch) -> dict:
    total = branch.tax_rate or 5.0
    service = getattr(branch, "service_charge_rate", 0) or 0
    return {"cgst_rate": total / 2, "sgst_rate": total / 2, "igst_rate": 0.0, "service_charge_rate": service}


async def validate_coupon(
    db: AsyncSession,
    code: str,
    restaurant_id: UUID,
    gross: float,
) -> tuple[Coupon | None, float, str | None]:
    if not code:
        return None, 0.0, None
    result = await db.execute(
        select(Coupon).where(
            Coupon.code == code.upper(),
            Coupon.restaurant_id == restaurant_id,
            Coupon.status == "active",
        )
    )
    coupon = result.scalar_one_or_none()
    if not coupon:
        return None, 0.0, "Invalid coupon code"
    now = datetime.now(timezone.utc)
    if coupon.valid_from and coupon.valid_from.replace(tzinfo=timezone.utc) > now:
        return None, 0.0, "Coupon not yet valid"
    if coupon.valid_until and coupon.valid_until.replace(tzinfo=timezone.utc) < now:
        return None, 0.0, "Coupon expired"
    if coupon.max_uses and coupon.used_count >= coupon.max_uses:
        return None, 0.0, "Coupon usage limit reached"
    if gross < coupon.min_order_amount:
        return None, 0.0, f"Minimum order ₹{coupon.min_order_amount:.0f} required"
    if coupon.discount_type == "percent":
        discount = gross * (coupon.discount_value / 100)
    else:
        discount = min(coupon.discount_value, gross)
    return coupon, round(discount, 2), None


async def calculate_bill(
    db: AsyncSession,
    branch: Branch,
    lines: list[LineInput],
    coupon_code: str | None = None,
    loyalty_points_redeem: int = 0,
    customer: Customer | None = None,
    restaurant_id: UUID | None = None,
) -> BillResult:
    gross = 0.0
    line_items: list[dict] = []
    for line in lines:
        item = await db.get(MenuItem, line.menu_item_id)
        if not item:
            continue
        price = line.unit_price if line.unit_price is not None else item.price
        line_total = round(price * line.quantity, 2)
        gross += line_total
        line_items.append({
            "menu_item_id": str(item.id),
            "item_name": item.name,
            "quantity": line.quantity,
            "unit_price": price,
            "line_total": line_total,
            "is_veg": item.is_veg,
        })

    rid = restaurant_id or branch.restaurant_id
    coupon, coupon_discount, _ = await validate_coupon(db, coupon_code or "", rid, gross) if coupon_code else (None, 0.0, None)

    loyalty_discount = 0.0
    points_used = 0
    if loyalty_points_redeem > 0 and customer:
        max_redeem = min(customer.loyalty_points, loyalty_points_redeem)
        loyalty_discount = round(max_redeem * 0.25, 2)  # 1 point = ₹0.25
        points_used = max_redeem

    discount = coupon_discount + loyalty_discount
    taxable = max(0.0, gross - discount)

    tax_cfg = _branch_tax_config(branch)
    service_charge = round(taxable * (tax_cfg["service_charge_rate"] / 100), 2)
    base_for_tax = taxable + service_charge

    cgst = round(base_for_tax * (tax_cfg["cgst_rate"] / 100), 2)
    sgst = round(base_for_tax * (tax_cfg["sgst_rate"] / 100), 2)
    igst = round(base_for_tax * (tax_cfg["igst_rate"] / 100), 2)
    total_tax = cgst + sgst + igst
    net = round(taxable + service_charge + total_tax, 2)

    return BillResult(
        gross_amount=round(gross, 2),
        discount_amount=round(coupon_discount, 2),
        loyalty_discount=loyalty_discount,
        service_charge_amount=service_charge,
        taxable_amount=round(taxable, 2),
        cgst_amount=cgst,
        sgst_amount=sgst,
        igst_amount=igst,
        tax_amount=round(total_tax, 2),
        net_amount=net,
        coupon_code=coupon.code if coupon else None,
        loyalty_points_redeemed=points_used,
        tax_breakdown={
            "cgst_rate": tax_cfg["cgst_rate"],
            "sgst_rate": tax_cfg["sgst_rate"],
            "igst_rate": tax_cfg["igst_rate"],
            "service_charge_rate": tax_cfg["service_charge_rate"],
            "cgst": cgst,
            "sgst": sgst,
            "igst": igst,
            "service_charge": service_charge,
        },
        lines=line_items,
    )


def apply_bill_to_order(order, bill: BillResult) -> None:
    order.gross_amount = bill.gross_amount
    order.discount_amount = bill.discount_amount + bill.loyalty_discount
    order.tax_amount = bill.tax_amount
    order.net_amount = bill.net_amount
    order.coupon_code = bill.coupon_code
    if hasattr(order, "service_charge_amount"):
        order.service_charge_amount = bill.service_charge_amount
    if hasattr(order, "tax_breakdown"):
        order.tax_breakdown = {**bill.tax_breakdown, "loyalty_discount": bill.loyalty_discount, "lines": bill.lines}


async def earn_loyalty_on_payment(db: AsyncSession, order, customer: Customer | None) -> int:
    if not customer:
        return 0
    points = int(order.net_amount // 100) * 10  # 10 points per ₹100
    if points <= 0:
        return 0
    customer.loyalty_points += points
    from app.models import LoyaltyTransaction
    db.add(LoyaltyTransaction(
        restaurant_id=order.restaurant_id,
        branch_id=order.branch_id,
        customer_id=customer.id,
        points=points,
        transaction_type="earn",
        order_id=order.id,
        notes=f"Earned on {order.order_number}",
        created_by=order.created_by,
    ))
    if customer.loyalty_points >= 500:
        customer.tier = "gold"
    elif customer.loyalty_points >= 200:
        customer.tier = "silver"
    return points


async def build_receipt(db: AsyncSession, order, lines: list) -> dict:
    branch = await db.get(Branch, order.branch_id)
    restaurant = await db.get(Restaurant, order.restaurant_id)
    tax = order.tax_breakdown if hasattr(order, "tax_breakdown") and order.tax_breakdown else {}
    return {
        "order_number": order.order_number,
        "order_type": order.order_type,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "restaurant": {"name": restaurant.name if restaurant else "", "gstin": restaurant.gstin if restaurant else ""},
        "branch": {"name": branch.name if branch else "", "address": branch.address if branch else "", "city": branch.city if branch else ""},
        "lines": [{"item_name": l.item_name, "quantity": l.quantity, "unit_price": l.unit_price, "line_total": l.line_total} for l in lines],
        "gross_amount": order.gross_amount,
        "discount_amount": order.discount_amount,
        "service_charge": getattr(order, "service_charge_amount", 0) or tax.get("service_charge", 0),
        "cgst": tax.get("cgst", order.tax_amount / 2 if order.tax_amount else 0),
        "sgst": tax.get("sgst", order.tax_amount / 2 if order.tax_amount else 0),
        "tax_amount": order.tax_amount,
        "net_amount": order.net_amount,
        "coupon_code": order.coupon_code,
        "payment_status": order.payment_status,
        "tax_breakdown": tax,
    }
