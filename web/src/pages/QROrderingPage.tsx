import POSPage from './POSPage';

export default function QROrderingPage() {
  return (
    <div>
      <div className="mb-4 rounded-xl bg-amber-warm/10 p-4 text-sm text-coffee">
        QR ordering uses the same order API. Customers scan table QR codes to access <code>/r/&#123;slug&#125;</code> public menu.
      </div>
      <POSPage />
    </div>
  );
}
