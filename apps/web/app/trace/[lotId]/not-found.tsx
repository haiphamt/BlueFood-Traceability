import Link from 'next/link';
import { BlueFoodLogo } from '@/components/trace/icons';

export default function TraceNotFound() {
  return (
    <main className="min-h-screen bg-trace-paper px-4 py-10 text-trace-ink">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-2 text-trace-forest">
          <BlueFoodLogo className="h-8 w-8" />
          <span className="text-lg font-bold">BlueFood</span>
        </div>

        <section className="mt-8 rounded-lg border border-trace-line bg-white p-5 shadow-card">
          <h1 className="text-xl font-bold">Không tìm thấy lô hàng này</h1>
          <p className="mt-2 text-sm text-trace-muted">Kiểm tra lại mã LOT trên bao bì hoặc nhập mã khác.</p>

          <form action="/trace" className="mt-5 flex gap-2">
            <input
              name="lot"
              placeholder="LOT-2605-9135"
              className="min-w-0 flex-1 rounded-md border border-trace-line px-3 py-2 font-mono text-sm outline-none focus:border-trace-mint"
            />
            <button type="submit" className="rounded-md bg-trace-forest px-4 py-2 text-sm font-bold text-white">
              Tìm
            </button>
          </form>

          <Link href="/" className="mt-5 inline-flex text-sm font-bold text-trace-forest underline-offset-4 hover:underline">
            Quay lại BlueFood
          </Link>
        </section>
      </div>
    </main>
  );
}
