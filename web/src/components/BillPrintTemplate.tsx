import { useRef } from 'react';

export default function BillPrintTemplate({ receipt, onClose }: { receipt: Record<string, unknown>; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const lines = (receipt.lines as Array<Record<string, unknown>>) || [];

  const print = () => {
    const w = window.open('', '_blank');
    if (!w || !ref.current) return;
    w.document.write(`<html><head><title>Bill ${receipt.order_number}</title>
      <style>body{font-family:monospace;max-width:320px;margin:0 auto;padding:16px;font-size:12px}
      table{width:100%;border-collapse:collapse}td{padding:2px 0}.total{font-weight:bold;font-size:14px}
      hr{border:none;border-top:1px dashed #000;margin:8px 0}</style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const rest = receipt.restaurant as Record<string, string> | undefined;
  const branch = receipt.branch as Record<string, string> | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card max-w-md w-full max-h-[90vh] overflow-auto">
        <div ref={ref} className="font-mono text-sm">
          <div className="text-center">
            <p className="font-bold text-lg">{String(rest?.name || 'Sumaya Resto')}</p>
            <p className="text-xs">{String(branch?.address || branch?.city || '')}</p>
            {rest?.gstin && <p className="text-xs">GSTIN: {rest.gstin}</p>}
          </div>
          <hr className="my-3 border-dashed border-coffee/30" />
          <p>Order: {String(receipt.order_number)}</p>
          <p className="capitalize">{String(receipt.order_type).replace('_', ' ')}</p>
          <hr className="my-3 border-dashed border-coffee/30" />
          <table className="w-full">
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>{String(l.item_name)} x{Number(l.quantity)}</td>
                  <td className="text-right">₹{Number(l.line_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="my-3 border-dashed border-coffee/30" />
          <p className="flex justify-between"><span>Subtotal</span><span>₹{Number(receipt.gross_amount).toFixed(2)}</span></p>
          {Number(receipt.discount_amount) > 0 && (
            <p className="flex justify-between text-green-700"><span>Discount</span><span>-₹{Number(receipt.discount_amount).toFixed(2)}</span></p>
          )}
          {Number(receipt.service_charge) > 0 && (
            <p className="flex justify-between"><span>Service</span><span>₹{Number(receipt.service_charge).toFixed(2)}</span></p>
          )}
          <p className="flex justify-between"><span>CGST</span><span>₹{Number(receipt.cgst).toFixed(2)}</span></p>
          <p className="flex justify-between"><span>SGST</span><span>₹{Number(receipt.sgst).toFixed(2)}</span></p>
          <p className="flex justify-between total text-base mt-2"><span>TOTAL</span><span>₹{Number(receipt.net_amount).toFixed(2)}</span></p>
          <hr className="my-3 border-dashed border-coffee/30" />
          <p className="text-center text-xs">Thank you! Visit again.</p>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={print} className="btn-primary flex-1">Print Bill</button>
          {onClose && <button onClick={onClose} className="btn-secondary flex-1">Close</button>}
        </div>
      </div>
    </div>
  );
}
