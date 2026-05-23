import { EVENT_TYPE_LABELS } from '@bluefood/shared';
import type { BatchEvent } from '@bluefood/shared';
import { formatDateTime } from '@/lib/utils';
import { BlockchainBadge, type BlockchainStatus } from '@/components/blockchain-badge';
import {
  Leaf, FlaskConical, Package, Truck, Store, ShieldCheck,
  AlertTriangle, RotateCcw, Wrench, Circle,
} from 'lucide-react';

export interface BlockchainRecord {
  status: BlockchainStatus;
  jobId: string;
  txHash?: string;
}

interface BatchTimelineProps {
  events: BatchEvent[];
  blockchainMap?: Record<string, BlockchainRecord>;
}

const EVENT_ICON: Record<string, React.ElementType> = {
  created:           Package,
  harvested:         Leaf,
  packed:            Package,
  quality_checked:   FlaskConical,
  pickup:            Truck,
  in_transit:        Truck,
  delivered:         Store,
  received_at_store: Store,
  sold:              ShieldCheck,
  issue_reported:    AlertTriangle,
  recalled:          RotateCcw,
  correction:        Wrench,
};

const EVENT_COLOR: Record<string, { dot: string; text: string }> = {
  created:           { dot: '#286b3f', text: 'white' },
  harvested:         { dot: '#286b3f', text: 'white' },
  packed:            { dot: '#286b3f', text: 'white' },
  quality_checked:   { dot: '#286b3f', text: 'white' },
  pickup:            { dot: '#286b3f', text: 'white' },
  in_transit:        { dot: '#727973', text: 'white' },
  delivered:         { dot: '#286b3f', text: 'white' },
  received_at_store: { dot: '#286b3f', text: 'white' },
  sold:              { dot: '#286b3f', text: 'white' },
  issue_reported:    { dot: '#ba1a1a', text: 'white' },
  recalled:          { dot: '#ba1a1a', text: 'white' },
  correction:        { dot: '#727973', text: 'white' },
};

export function BatchTimeline({ events, blockchainMap }: BatchTimelineProps) {
  if (events.length === 0) {
    return (
      <div
        className="admin-muted text-center py-10 text-sm rounded-lg border border-dashed border-slate-200 bg-slate-50 dark:border-[#2a2a2d] dark:bg-[#111113]"
      >
        Chưa có sự kiện nào
      </div>
    );
  }

  return (
    <div className="relative pl-10 flex flex-col gap-5">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-4 bottom-4 w-[2px] rounded-full bg-slate-200 dark:bg-[#2a2a2d]" />

      {events.map((event) => {
        const Icon = EVENT_ICON[event.eventType] ?? Circle;
        const colors = EVENT_COLOR[event.eventType] ?? { dot: '#727973', text: 'white' };
        const bcRecord = blockchainMap?.[event.id];
        const polygonscanBase = process.env.NEXT_PUBLIC_POLYGONSCAN_BASE_URL ?? 'https://amoy.polygonscan.com';

        return (
          <div key={event.id} className="relative z-10 flex gap-4 group">
            {/* Dot */}
            <div
              className="absolute -left-[37px] mt-1 h-8 w-8 rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-[#171717] z-20 flex-shrink-0"
              style={{ background: colors.dot, color: colors.text }}
            >
              <Icon size={14} strokeWidth={2} />
            </div>

            {/* Card */}
            <div
              className="rounded-lg p-4 w-full border border-slate-200 bg-white transition-colors group-hover:bg-slate-50 dark:border-[#2a2a2d] dark:bg-[#171717] dark:group-hover:bg-[#1f1f22]"
            >
              <div className="flex justify-between items-start mb-2 gap-3 flex-wrap">
                <h4 className="text-base font-semibold text-slate-950 dark:text-[#f5f5f5]">
                  {(EVENT_TYPE_LABELS as Record<string, string>)[event.eventType] ?? event.eventType}
                </h4>
                <span className="text-xs flex-shrink-0 text-slate-500 dark:text-[#737373]">
                  {formatDateTime(event.occurredAt)}
                </span>
              </div>

              {event.locationName && (
                <p className="text-xs mb-1 text-slate-700 dark:text-[#d4d4d4]">📍 {event.locationName}</p>
              )}
              {event.temperatureC != null && (
                <p className="text-xs mb-1 text-slate-700 dark:text-[#d4d4d4]">🌡️ {event.temperatureC}°C</p>
              )}
              {event.note && (
                <p className="text-sm mt-1 text-slate-700 dark:text-[#d4d4d4]">{event.note}</p>
              )}

              {/* Tags */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {event.isLate && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    LATE
                  </span>
                )}
                {bcRecord && (
                  <BlockchainBadge
                    jobId={bcRecord.jobId}
                    txHash={bcRecord.txHash}
                    initialStatus={bcRecord.status}
                  />
                )}
                {blockchainMap && !bcRecord && (
                  <BlockchainBadge initialStatus="not_anchored" />
                )}
                {bcRecord?.txHash && (
                  <a
                    href={`${polygonscanBase}/tx/${bcRecord.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors dark:bg-[rgba(34,197,94,0.10)] dark:text-[#22c55e] dark:border-[rgba(34,197,94,0.30)] dark:hover:bg-[rgba(34,197,94,0.18)]"
                  >
                    <ShieldCheck size={11} />
                    Block: {bcRecord.txHash.slice(0, 8)}…
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
