import type { TraceCertificate } from './types';

function daysUntil(date?: string | null) {
  if (!date) return null;
  const end = new Date(`${date}T23:59:59`);
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}

function formatDate(date?: string | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
}

function certColor(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('global')) return 'border-blue-200 bg-blue-50 text-trace-blue';
  if (normalized.includes('organic') || normalized.includes('hữu cơ')) return 'border-green-200 bg-green-50 text-trace-organic';
  return 'border-teal-200 bg-teal-50 text-trace-teal';
}

interface CertificateGridProps {
  certificates: TraceCertificate[];
}

export function CertificateGrid({ certificates }: CertificateGridProps) {
  if (certificates.length === 0) {
    return (
      <section className="rounded-lg border border-trace-line bg-white p-4 shadow-card">
        <h2 className="text-base font-bold text-trace-ink">Chứng nhận</h2>
        <p className="mt-3 text-sm text-trace-muted">Chưa có chứng nhận công khai cho lô hàng này.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-trace-line bg-white p-4 shadow-card">
      <h2 className="text-base font-bold text-trace-ink">Chứng nhận</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {certificates.map((cert) => {
          const remaining = daysUntil(cert.validUntil);
          const expired = remaining !== null && remaining < 0;
          const expiring = remaining !== null && remaining >= 0 && remaining <= 90;

          return (
            <article key={cert.id} className={`rounded-lg border p-3 ${certColor(cert.type)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold">{cert.type}</h3>
                  {cert.issuer && <p className="mt-1 text-xs font-medium text-trace-ink">{cert.issuer}</p>}
                  {cert.certNumber && <p className="mt-0.5 font-mono text-[11px] text-trace-muted">{cert.certNumber}</p>}
                </div>

                {expired ? (
                  <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-trace-danger">
                    Đã hết hạn
                  </span>
                ) : expiring ? (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-trace-amber">
                    còn {remaining} ngày
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-xs text-trace-muted">
                {formatDate(cert.validFrom)} - {formatDate(cert.validUntil)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
