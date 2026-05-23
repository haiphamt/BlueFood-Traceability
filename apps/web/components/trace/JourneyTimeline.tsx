import type { TraceTimelineStep } from './types';
import { ChainIcon, CheckIcon, FarmIcon, PackageIcon, StoreIcon, TruckIcon } from './icons';

const ICONS = {
  harvest: FarmIcon,
  packaging: PackageIcon,
  qc: CheckIcon,
  transport: TruckIcon,
  received: StoreIcon,
};

function truncateHash(hash: string) {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

interface JourneyTimelineProps {
  steps: TraceTimelineStep[];
  polygonscanBaseUrl: string;
}

export function JourneyTimeline({ steps, polygonscanBaseUrl }: JourneyTimelineProps) {
  return (
    <section className="rounded-lg border border-trace-line bg-white p-4 shadow-card">
      <h2 className="text-base font-bold text-trace-ink">Hành trình lô hàng</h2>
      <div className="mt-4 space-y-0">
        {steps.map((step, index) => {
          const Icon = ICONS[step.key];
          const isLast = index === steps.length - 1;
          const hasProof = Boolean(step.proof?.txHash);
          const txHref = hasProof ? `${polygonscanBaseUrl.replace(/\/$/, '')}/tx/${step.proof?.txHash}` : undefined;

          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex w-8 flex-col items-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-trace-forest ring-1 ring-emerald-100">
                  <Icon className="h-4 w-4" />
                </span>
                {!isLast && <span className="mt-1 h-full min-h-8 w-px bg-trace-line" />}
              </div>

              <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-trace-ink">{step.name}</h3>
                  {step.certLabel && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      {step.certLabel}
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs leading-5 text-trace-muted">
                  {step.date ?? 'Chưa cập nhật'}
                  {step.location ? ` · ${step.location}` : ''}
                </p>

                {step.carrierName && (
                  <p className="mt-1 text-xs font-medium text-trace-ink">Đơn vị vận chuyển: {step.carrierName}</p>
                )}
                {step.notes && <p className="mt-1 text-xs leading-5 text-trace-muted">{step.notes}</p>}

                {hasProof && txHref && (
                  <a
                    href={txHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 font-mono text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100"
                  >
                    <ChainIcon className="h-3.5 w-3.5" />
                    {truncateHash(step.proof!.txHash)}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
