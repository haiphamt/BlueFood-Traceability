import { BlockchainBadge } from './BlockchainBadge';

interface HeroCardProps {
  productName: string;
  lotId: string;
  supplierName: string;
  supplierLocation?: string | null;
  harvestDateLabel: string;
  verified: boolean;
  tampered?: boolean;
}

export function HeroCard({
  productName,
  lotId,
  supplierName,
  supplierLocation,
  harvestDateLabel,
  verified,
  tampered = false,
}: HeroCardProps) {
  return (
    <section className="bg-trace-forest px-4 py-6 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="space-y-4">
          <div>
            <h1 className="text-[22px] font-bold leading-7">{productName}</h1>
            <p className="mt-1 font-mono text-sm font-semibold text-trace-mint">{lotId}</p>
          </div>

          <div className="space-y-1 text-sm text-white/86">
            <p className="font-medium text-white">{supplierName}</p>
            {supplierLocation && <p>{supplierLocation}</p>}
            <p>{harvestDateLabel}</p>
          </div>

          <BlockchainBadge verified={verified} tampered={tampered} />
        </div>
      </div>
    </section>
  );
}
