import { AlertIcon, ChainIcon, ShieldCheckIcon } from './icons';

interface BlockchainBadgeProps {
  verified: boolean;
  tampered?: boolean;
  compact?: boolean;
}

export function BlockchainBadge({ verified, tampered = false, compact = false }: BlockchainBadgeProps) {
  if (tampered) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-bold text-trace-danger ring-1 ring-red-200">
        <AlertIcon className="h-4 w-4" />
        Cảnh báo dữ liệu bất thường
      </span>
    );
  }

  if (!verified) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-trace-amber ring-1 ring-amber-200">
        <ChainIcon className="h-4 w-4" />
        Đang xác thực...
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-trace-forest ring-1 ring-emerald-200">
      <ShieldCheckIcon className="h-4 w-4 text-trace-mint" />
      {compact ? 'Đã xác thực' : 'Đã xác thực blockchain · Polygon PoS'}
    </span>
  );
}
