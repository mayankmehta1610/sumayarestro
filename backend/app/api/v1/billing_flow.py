import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Branch, Customer, OrderHeader, OrderLine, Payment, PrinterJob, Restaurant
from app.schemas.common import get_or_404
from app.services.billing import (
    BillResult,
    LineInput,
    apply_bill_to_order,
    build_receipt,
    calculate_bill,
    earn_loyalty_on_payment,
    validate_coupon,
)

router = APIRouter(prefix="/billing", tags=["billing"])


class BillPreviewRequest(BaseModel):
    branch_id: UUID
    lines: list[dict]
    coupon_code: str | None = None
    loyalty_points_redeem: int = 0


class ApplyCouponRequest(BaseModel):
    coupon_code: str
    loyalty_points_redeem: int = 0


class PayBillRequest(BaseModel):
    payment_method: str = "cash"
    coupon_code: str | None = None
    loyalty_points_redeem: int = 0


@router.post("/preview")
async def preview_bill(payload: BillPreviewRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    branch = await db.get(Branch, payload.branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    customer = None
    if user.get("role") == "customer":
        cr = await db.execute(select(Customer).where(Customer.email == user["email"]))
        customer = cr.scalar_one_or_none()
    lines = [LineInput(menu_item_id=UUID(l["menu_item_id"]), quantity=l.get("quantity", 1)) for l in payload.lines]
    bill = await calculate_bill(db, branch, lines, payload.coupon_code, payload.loyalty_points_redeem, customer)
    return _bill_dict(bill)


@router.get("/receipt/{order_id}")
async def get_receipt(order_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    order = await get_or_404(db, OrderHeader, order_id, user)
    lines_result = await db.execute(select(OrderLine).where(OrderLine.order_id == order.id, OrderLine.status != "deleted"))
    lines = lines_result.scalars().all()
    return await build_receipt(db, order, lines)


@router.post("/apply-coupon/{order_id}")
async def apply_coupon_to_order(
    order_id: UUID,
    payload: ApplyCouponRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    order = await get_or_404(db, OrderHeader, order_id, user)
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Order already paid")
    branch = await db.get(Branch, order.branch_id)
    lines_result = await db.execute(select(OrderLine).where(OrderLine.order_id == order.id))
    lines = [LineInput(menu_item_id=l.menu_item_id, quantity=l.quantity, unit_price=l.unit_price) for l in lines_result.scalars().all()]
    customer = None
    if order.customer_id:
        customer = await db.get(Customer, order.customer_id)
    bill = await calculate_bill(db, branch, lines, payload.coupon_code, payload.loyalty_points_redeem, customer, order.restaurant_id)
    apply_bill_to_order(order, bill)
    await db.flush()
    return {"message": "Bill updated", "bill": _bill_dict(bill)}


@router.post("/pay/{order_id}")
async def pay_bill(
    order_id: UUID,
    payload: PayBillRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    order = await get_or_404(db, OrderHeader, order_id, user)
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Already paid")
    branch = await db.get(Branch, order.branch_id)
    lines_result = await db.execute(select(OrderLine).where(OrderLine.order_id == order.id))
    order_lines = lines_result.scalars().all()
    customer = await db.get(Customer, order.customer_id) if order.customer_id else None

    if payload.coupon_code or payload.loyalty_points_redeem:
        lines = [LineInput(menu_item_id=l.menu_item_id, quantity=l.quantity, unit_price=l.unit_price) for l in order_lines]
        bill = await calculate_bill(db, branch, lines, payload.coupon_code, payload.loyalty_points_redeem, customer, order.restaurant_id)
        apply_bill_to_order(order, bill)
        if customer and bill.loyalty_points_redeemed:
            customer.loyalty_points -= bill.loyalty_points_redeemed

    payment = Payment(
        restaurant_id=order.restaurant_id,
        branch_id=order.branch_id,
        order_id=order.id,
        amount=order.net_amount,
        payment_method=payload.payment_method,
        payment_status="completed",
        created_by=UUID(user["id"]),
    )
    db.add(payment)
    order.payment_status = "paid"
    order.order_status = "completed"

    points_earned = await earn_loyalty_on_payment(db, order, customer)

    from app.models import Table
    if order.table_id:
        table = await db.get(Table, order.table_id)
        if table:
            table.table_status = "available"

    db.add(PrinterJob(
        restaurant_id=order.restaurant_id,
        branch_id=order.branch_id,
        job_type="bill",
        reference_id=order.id,
        content=json.dumps({"order_number": order.order_number}),
        job_status="queued",
        created_by=UUID(user["id"]),
    ))

    await db.flush()
    receipt = await build_receipt(db, order, order_lines)
    return {"message": "Payment collected", "receipt": receipt, "loyalty_points_earned": points_earned}


@router.post("/print/{order_id}")
async def print_bill(order_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    order = await get_or_404(db, OrderHeader, order_id, user)
    lines_result = await db.execute(select(OrderLine).where(OrderLine.order_id == order.id))
    lines = lines_result.scalars().all()
    receipt = await build_receipt(db, order, lines)
    job = PrinterJob(
        restaurant_id=order.restaurant_id,
        branch_id=order.branch_id,
        job_type="bill",
        reference_id=order.id,
        content=json.dumps(receipt),
        job_status="queued",
        created_by=UUID(user["id"]),
    )
    db.add(job)
    await db.flush()
    return {"message": "Print job queued", "receipt": receipt, "job_id": str(job.id)}


@router.get("/validate-coupon/{code}")
async def validate_coupon_code(code: str, gross: float = 0, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    rid = UUID(user["restaurant_id"]) if user.get("restaurant_id") else None
    if not rid:
        raise HTTPException(status_code=400, detail="Restaurant context required")
    coupon, discount, error = await validate_coupon(db, code, rid, gross)
    if error:
        return {"valid": False, "error": error}
    return {"valid": True, "discount": discount, "code": coupon.code if coupon else code}


def _bill_dict(bill: BillResult) -> dict:
    return {
        "gross_amount": bill.gross_amount,
        "discount_amount": bill.discount_amount,
        "loyalty_discount": bill.loyalty_discount,
        "service_charge_amount": bill.service_charge_amount,
        "taxable_amount": bill.taxable_amount,
        "cgst_amount": bill.cgst_amount,
        "sgst_amount": bill.sgst_amount,
        "tax_amount": bill.tax_amount,
        "net_amount": bill.net_amount,
        "coupon_code": bill.coupon_code,
        "loyalty_points_redeemed": bill.loyalty_points_redeemed,
        "tax_breakdown": bill.tax_breakdown,
        "lines": bill.lines,
    }
