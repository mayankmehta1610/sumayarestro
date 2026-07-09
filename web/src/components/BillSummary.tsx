export interface BillData {
  gross_amount?: number;
  discount_amount?: number;
  loyalty_discount?: number;
  service_charge_amount?: number;
  taxable_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  tax_amount?: number;
  net_amount?: number;
  coupon_code?: string | null;
  tax_breakdown?: Record<string, number>;
}

export default function BillSummary({ bill, compact }: { bill: BillData; compact?: boolean }) {
  const b = bill;
  const cgst = b.cgst_amount ?? b.tax_breakdown?.cgst ?? (b.tax_amount || 0) / 2;
  const sgst = b.sgst_amount ?? b.tax_breakdown?.sgst ?? (b.tax_amount || 0) / 2;
  const service = b.service_charge_amount ?? b.tax_breakdown?.service_charge ?? 0;
  const discount = (b.discount_amount || 0) + (b.loyalty_discount || 0);

  if (compact) {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>₹{(b.gross_amount || 0).toFixed(2)}</span></div>
        {discount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-₹{discount.toFixed(2)}</span></div>}
        {service > 0 && <div className="flex justify-between"><span>Service charge</span><span>₹{service.toFixed(2)}</span></div>}
        <div className="flex justify-between"><span>CGST</span><span>₹{cgst.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>SGST</span><span>₹{sgst.toFixed(2)}</span></div>
        <div className="flex justify-between border-t pt-2 font-bold text-chili"><span>Total</span><span>₹{(b.net_amount || 0).toFixed(2)}</span></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-warm/20 bg-cream/50 p-4 space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-coffee/70">Subtotal</span><span>₹{(b.gross_amount || 0).toFixed(2)}</span></div>
      {discount > 0 && (
        <div className="flex justify-between text-green-700">
          <span>Discount {b.coupon_code ? `(${b.coupon_code})` : ''}</span>
          <span>-₹{discount.toFixed(2)}</span>
        </div>
      )}
      {service > 0 && <div className="flex justify-between"><span className="text-coffee/70">Service charge</span><span>₹{service.toFixed(2)}</span></div>}
      <div className="flex justify-between"><span className="text-coffee/70">CGST</span><span>₹{cgst.toFixed(2)}</span></div>
      <div className="flex justify-between"><span className="text-coffee/70">SGST</span><span>₹{sgst.toFixed(2)}</span></div>
      <div className="flex justify-between border-t border-amber-warm/30 pt-2 text-lg font-bold text-espresso">
        <span>Total</span><span className="text-chili">₹{(b.net_amount || 0).toFixed(2)}</span>
      </div>
    </div>
  );
}
