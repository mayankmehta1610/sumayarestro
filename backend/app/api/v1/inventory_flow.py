from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import GoodsReceipt, Ingredient, PurchaseOrder, StockLedger, Wastage
from app.schemas.common import apply_tenant_filter, get_or_404

router = APIRouter(prefix="/inventory-flow", tags=["inventory"])


class ReceiveGoodsRequest(BaseModel):
    purchase_order_id: UUID
    notes: str | None = None


class WastageRequest(BaseModel):
    ingredient_id: UUID
    quantity: float
    reason: str | None = None


@router.post("/receive-goods")
async def receive_goods(payload: ReceiveGoodsRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    po = await get_or_404(db, PurchaseOrder, payload.purchase_order_id, user)
    if po.po_status == "received":
        raise HTTPException(status_code=400, detail="PO already received")
    from app.models import PurchaseOrderLine
    lines = (await db.execute(select(PurchaseOrderLine).where(PurchaseOrderLine.purchase_order_id == po.id))).scalars().all()
    grn_number = f"GRN-{po.po_number}"
    gr = GoodsReceipt(
        restaurant_id=po.restaurant_id,
        branch_id=po.branch_id,
        purchase_order_id=po.id,
        grn_number=grn_number,
        notes=payload.notes,
        created_by=UUID(user["id"]),
    )
    db.add(gr)
    for line in lines:
        ing = await db.get(Ingredient, line.ingredient_id)
        if ing:
            ing.current_stock += line.quantity
            db.add(StockLedger(
                restaurant_id=po.restaurant_id,
                branch_id=po.branch_id,
                ingredient_id=ing.id,
                movement_type="in",
                quantity=line.quantity,
                reference_type="grn",
                reference_id=gr.id,
                notes=f"GRN {grn_number}",
                created_by=UUID(user["id"]),
            ))
    po.po_status = "received"
    await db.flush()
    return {"message": "Goods received", "grn_number": grn_number}


@router.post("/record-wastage")
async def record_wastage(payload: WastageRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    ing = await get_or_404(db, Ingredient, payload.ingredient_id, user)
    if ing.current_stock < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    ing.current_stock -= payload.quantity
    w = Wastage(
        restaurant_id=ing.restaurant_id,
        branch_id=ing.branch_id,
        ingredient_id=ing.id,
        quantity=payload.quantity,
        reason=payload.reason,
        created_by=UUID(user["id"]),
    )
    db.add(w)
    db.add(StockLedger(
        restaurant_id=ing.restaurant_id,
        branch_id=ing.branch_id,
        ingredient_id=ing.id,
        movement_type="out",
        quantity=payload.quantity,
        reference_type="wastage",
        reference_id=w.id,
        notes=payload.reason,
        created_by=UUID(user["id"]),
    ))
    await db.flush()
    return {"message": "Wastage recorded", "remaining_stock": ing.current_stock}


@router.get("/low-stock")
async def low_stock(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    query = select(Ingredient).where(Ingredient.current_stock <= Ingredient.reorder_level)
    query = apply_tenant_filter(query, Ingredient, user)
    items = (await db.execute(query)).scalars().all()
    return {"items": [{"id": str(i.id), "name": i.name, "current_stock": i.current_stock, "reorder_level": i.reorder_level, "unit": i.unit} for i in items]}
