import type { BatchStatus } from '@bluefood/shared';
import { BATCH_STATUS_LABELS } from '@bluefood/shared';

interface StatusBadgeProps {
  status: BatchStatus;
  className?: string;
}

const STATUS_STYLES: Record<BatchStatus, string> = {
  draft:             'admin-badge-blue',
  created:           'admin-badge-blue',
  harvested:         'admin-badge-green',
  packed:            'admin-badge-green',
  quality_checked:   'admin-badge-green',
  in_transit:        'admin-badge-purple',
  received_at_store: 'admin-badge-green',
  sold:              'admin-badge-green',
  recalled:          'admin-badge-red',
  cancelled:         'admin-badge-blue',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = STATUS_STYLES[status] ?? 'admin-badge-muted';
  return (
    <span
      className={[
        'admin-badge inline-flex items-center px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        s,
        className,
      ].filter(Boolean).join(' ')}
    >
      {BATCH_STATUS_LABELS[status] ?? status}
    </span>
  );
}
