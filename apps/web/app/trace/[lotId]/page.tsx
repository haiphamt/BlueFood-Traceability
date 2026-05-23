import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  ImageIcon,
  Info,
  Leaf,
  Mail,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Scale,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Thermometer,
  Truck,
} from "lucide-react";
import { QrScanLogger } from "@/components/trace/QrScanLogger";
import { AutoRefresh } from "@/components/auto-refresh";
import type { BlockchainProof } from "@/components/trace/types";
import {
  getPublicTraceData,
  type TraceData,
  type DbBlockchain,
} from "@/lib/trace";
import { cn, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { ShareButton } from "./share-button";

export const dynamic = "force-dynamic";

const POLYGONSCAN_BASE_URL =
  process.env.NEXT_PUBLIC_POLYGONSCAN_BASE_URL ?? "https://polygonscan.com";

interface PageProps {
  params: { lotId: string };
}

type EventTone = "green" | "amber" | "red" | "blue" | "neutral";

const EVENT_CFG: Record<
  string,
  { label: string; Icon: LucideIcon; tone: EventTone }
> = {
  created: { label: "Tạo lô hàng", Icon: Package, tone: "blue" },
  harvested: { label: "Thu hoạch tại nông trại", Icon: Leaf, tone: "green" },
  packed: { label: "Phân loại và đóng gói", Icon: Package, tone: "green" },
  quality_checked: {
    label: "Kiểm tra chất lượng",
    Icon: CheckCircle2,
    tone: "green",
  },
  pickup: { label: "Xuất kho / Lấy hàng", Icon: Truck, tone: "amber" },
  in_transit: { label: "Đang vận chuyển", Icon: Truck, tone: "amber" },
  delivered: { label: "Giao đến điểm nhận", Icon: MapPin, tone: "green" },
  received_at_store: {
    label: "Nhận tại cửa hàng",
    Icon: Building2,
    tone: "green",
  },
  sold: { label: "Đã bán", Icon: ShoppingCart, tone: "green" },
  issue_reported: { label: "Báo cáo sự cố", Icon: AlertTriangle, tone: "red" },
  recalled: { label: "Thu hồi lô hàng", Icon: AlertTriangle, tone: "red" },
  correction: { label: "Điều chỉnh", Icon: RotateCcw, tone: "amber" },
};

const eventToneClasses: Record<
  EventTone,
  { node: string; icon: string; card: string }
> = {
  green: {
    node: "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10",
    icon: "text-emerald-700 dark:text-emerald-300",
    card: "border-emerald-100 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10",
  },
  amber: {
    node: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
    icon: "text-amber-700 dark:text-amber-300",
    card: "border-amber-100 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10",
  },
  red: {
    node: "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10",
    icon: "text-red-700 dark:text-red-300",
    card: "border-red-100 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/10",
  },
  blue: {
    node: "border-sky-300 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-500/10",
    icon: "text-sky-700 dark:text-sky-300",
    card: "border-sky-100 bg-sky-50/70 dark:border-sky-500/20 dark:bg-sky-500/10",
  },
  neutral: {
    node: "border-slate-300 bg-slate-50 dark:border-line dark:bg-[#1f1f22]",
    icon: "text-slate-600 dark:text-[#9ca3af]",
    card: "border-line bg-slate-50/80 dark:bg-[#1f1f22]",
  },
};

const batchStatusClasses: Record<string, { label: string; className: string }> =
  {
    created: {
      label: "Đã tạo",
      className:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-line dark:bg-[#1f1f22] dark:text-[#f5f5f5]",
    },
    harvested: {
      label: "Đã thu hoạch",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    packed: {
      label: "Đã đóng gói",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    in_transit: {
      label: "Đang vận chuyển",
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    },
    delivered: {
      label: "Đã giao",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    sold: {
      label: "Đã bán",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    recalled: {
      label: "Thu hồi",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    },
    cancelled: {
      label: "Đã hủy",
      className:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-line dark:bg-[#1f1f22] dark:text-[#f5f5f5]",
    },
  };

function getEventCfg(type: string) {
  return (
    EVENT_CFG[type] ?? { label: type, Icon: Info, tone: "neutral" as EventTone }
  );
}

function isCertExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function isCertExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function getCertificateState(expiresAt: string | null) {
  if (isCertExpired(expiresAt)) {
    return {
      label: "Hết hạn",
      card: "border-red-200 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10",
      icon: "border-red-200 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300",
      pill: "border-red-200 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300",
    };
  }

  if (isCertExpiringSoon(expiresAt)) {
    return {
      label: "Sắp hết hạn",
      card: "border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10",
      icon: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
      pill: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
    };
  }

  return {
    label: expiresAt ? "Còn hiệu lực" : "Chưa rõ",
    card: expiresAt
      ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10"
      : "border-sky-200 bg-sky-50/80 dark:border-sky-500/30 dark:bg-sky-500/10",
    icon: expiresAt
      ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
      : "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300",
    pill: expiresAt
      ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
      : "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300",
  };
}

function getCertificateIcon(certType: string): LucideIcon {
  const type = certType.toLowerCase();
  if (
    type.includes("vietgap") ||
    type.includes("organic") ||
    type.includes("hữu cơ")
  )
    return Leaf;
  if (type.includes("globalgap") || type.includes("global")) return Globe;
  if (type.includes("iso") || type.includes("haccp")) return ShieldCheck;
  return Award;
}

function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function firstRelation<T>(value: T[] | T | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function buildProofMap(rows: DbBlockchain[] | null) {
  const map = new Map<string, BlockchainProof>();
  for (const row of asArray(rows)) {
    if (!row.tx_hash) continue;
    map.set(row.batch_event_id, {
      txHash: row.tx_hash,
      status:
        row.status === "failed"
          ? "failed"
          : row.status === "pending"
            ? "pending"
            : "confirmed",
      blockNumber: row.block_number,
    });
  }
  return map;
}

function primaryTx(batch: TraceData) {
  return (
    asArray(batch.batch_blockchain).find(
      (r) => r.tx_hash && r.status === "confirmed",
    )?.tx_hash ?? null
  );
}

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function formatQuantity(quantity: TraceData["quantity"], unit: string | null) {
  const value =
    typeof quantity === "number"
      ? formatNumber(quantity)
      : quantity && String(quantity).trim().length > 0
        ? String(quantity)
        : "—";
  return unit && value !== "—" ? `${value} ${unit}` : value;
}

function shortHash(txHash: string) {
  return `${txHash.slice(0, 12)}...${txHash.slice(-8)}`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const data = await getPublicTraceData(params.lotId);
  if (!data)
    return { title: `Không tìm thấy lô hàng ${params.lotId} | BlueFood` };

  const product = firstRelation(data.products);
  const supplier = firstRelation(data.suppliers);
  const productName = product?.name ?? "Lô hàng BlueFood";
  const supplierName = supplier?.name ?? "BlueFood";

  return {
    title: `${productName} - ${params.lotId} | BlueFood`,
    description: `Truy xuất nguồn gốc: ${supplierName} - ${formatDate(data.harvest_date)}`,
    openGraph: {
      title: `${productName} - ${params.lotId}`,
      description: `Truy xuất nguồn gốc: ${supplierName}`,
      images: [`/api/og?lot=${encodeURIComponent(params.lotId)}`],
    },
  };
}

export default async function TracePage({ params }: PageProps) {
  const lotId = params.lotId;
  const data = await getPublicTraceData(lotId);

  if (!data) notFound();

  if (data.is_public === false) {
    return (
      <TraceShell>
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900 shadow-card dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle
              size={36}
              className="mx-auto mb-3 text-amber-500 dark:text-amber-300"
            />
            <p className="text-lg font-bold">
              Lô hàng này không hiển thị công khai
            </p>
            <p className="mt-2 text-sm opacity-80">
              Vui lòng liên hệ BlueFood hoặc nhà cung cấp để biết thêm thông
              tin.
            </p>
          </div>
        </div>
      </TraceShell>
    );
  }

  const product = firstRelation(data.products);
  const supplier = firstRelation(data.suppliers);
  const productName = product?.name ?? "Sản phẩm BlueFood";
  const supplierName = supplier?.name ?? "Nhà cung cấp BlueFood";
  const supplierLocation = supplier?.province ?? data.origin_location;
  const supplierAddress = supplier?.address ?? supplierLocation ?? "—";
  const certificates = asArray(data.certificates);
  const txHash = primaryTx(data);
  const verified = Boolean(txHash);
  const tampered =
    data.status === "recalled" ||
    asArray(data.batch_blockchain).some((r) => r.status === "failed");
  const polygonscanBaseUrl = POLYGONSCAN_BASE_URL.replace(/\/$/, "");
  const polygonscanUrl = txHash ? `${polygonscanBaseUrl}/tx/${txHash}` : null;
  const proofMap = buildProofMap(data.batch_blockchain);
  const sortedEvents = asArray(data.batch_events).sort(
    (a, b) =>
      new Date(a.occurred_at ?? 0).getTime() -
      new Date(b.occurred_at ?? 0).getTime(),
  );
  const isBatchDone = ["sold", "recalled", "delivered"].includes(data.status);
  const heroImageSrc = data.image_url || product?.image_url || null;
  const status = batchStatusClasses[data.status] ?? {
    label: data.status,
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-line dark:bg-[#1f1f22] dark:text-[#f5f5f5]",
  };
  const confirmedCount = asArray(data.batch_blockchain).filter(
    (r) => r.status === "confirmed",
  ).length;
  const totalEvents = sortedEvents.length;
  const integrityPct =
    totalEvents > 0 ? Math.round((confirmedCount / totalEvents) * 100) : 0;
  const shareUrl = `${appUrl()}/trace/${encodeURIComponent(lotId)}`;
  const blockchainState = tampered
    ? {
        title: "Cảnh báo xác minh",
        description:
          "Có bản ghi blockchain thất bại hoặc lô hàng đã bị thu hồi.",
        card: "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10",
        icon: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
      }
    : verified
      ? {
          title: "Đã xác minh Blockchain",
          description: `${confirmedCount}/${totalEvents} sự kiện đã có bằng chứng blockchain. Tính toàn vẹn ${integrityPct}%.`,
          card: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10",
          icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        }
      : {
          title:
            totalEvents > 0
              ? "Đang chờ neo blockchain"
              : "Chưa có dữ liệu blockchain",
          description:
            "Dữ liệu lô hàng đang được quản lý trên hệ thống BlueFood và chưa được neo lên blockchain.",
          card: "border-line bg-panel dark:bg-panel",
          icon: "bg-slate-100 text-slate-600 dark:bg-[#1f1f22] dark:text-[#9ca3af]",
        };

  const productFacts = [
    {
      label: "Thu hoạch",
      value: formatDate(data.harvest_date),
      Icon: Calendar,
    },
    {
      label: "Khối lượng",
      value: formatQuantity(data.quantity, data.unit),
      Icon: Scale,
    },
    {
      label: "Xuất xứ",
      value: supplierLocation ?? data.origin_location ?? "—",
      Icon: MapPin,
    },
    { label: "Hạn dùng", value: formatDate(data.expiration_date), Icon: Clock },
  ];

  const productInfo = [
    { label: "Sản phẩm", value: productName, Icon: Package },
    { label: "Danh mục", value: product?.category ?? "—", Icon: Leaf },
    {
      label: "Bảo quản",
      value:
        data.notes && data.notes.length < 80
          ? data.notes
          : "Bảo quản lạnh 2-8°C, tránh ánh nắng trực tiếp",
      Icon: Thermometer,
    },
    { label: "Nhà cung cấp", value: supplierName, Icon: Building2 },
    {
      label: "Ngày thu hoạch",
      value: formatDate(data.harvest_date),
      Icon: Calendar,
    },
    {
      label: "Ngày hết hạn",
      value: formatDate(data.expiration_date),
      Icon: Clock,
    },
  ];

  return (
    <TraceShell>
      <QrScanLogger lotId={lotId} />
      <AutoRefresh intervalMs={5000} />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:py-8">
        <section className="overflow-hidden rounded-2xl border border-line bg-panel shadow-card dark:bg-panel">
          <div className="grid min-h-[360px] grid-cols-1 md:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[260px] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#171717] dark:to-[#0d0d0f] md:min-h-full">
              {heroImageSrc ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImageSrc}
                    alt={productName}
                    className="h-full min-h-[260px] w-full object-cover md:absolute md:inset-0 md:min-h-0"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/45 to-transparent" />
                </>
              ) : (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center text-muted md:min-h-full">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-slate-500 shadow-sm dark:border-line dark:bg-[#111113]/70 dark:text-[#9ca3af]">
                    <ImageIcon size={24} />
                  </div>
                  <p className="text-sm font-semibold">Chưa có hình ảnh</p>
                </div>
              )}
              <div
                className={cn(
                  "absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur",
                  status.className,
                )}
              >
                {status.label}
              </div>
            </div>

            <div className="relative flex flex-col justify-center gap-6 overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 dark:bg-[#171717] dark:from-[#171717] dark:via-[#171717] dark:to-[#171717] sm:p-8 lg:p-10">
              <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,rgba(16,185,129,0.16)_1px,transparent_0)] [background-size:22px_22px] dark:opacity-[0.12] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.035)_1px,transparent_0)]" />
              <div className="relative flex flex-col gap-5">
                <div
                  className={cn(
                    "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm",
                    tampered
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                      : "border-emerald-200 bg-white/80 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
                  )}
                >
                  {tampered ? (
                    <AlertTriangle size={15} />
                  ) : (
                    <ShieldCheck size={15} />
                  )}
                  {tampered
                    ? "Lô hàng đang có cảnh báo xác minh"
                    : "Hàng hóa đã được xác thực nguồn gốc toàn diện"}
                </div>

                <div>
                  <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-normal text-ink lg:text-4xl">
                    {productName}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted">
                      Mã lô
                    </span>
                    <code className="rounded-full border border-line bg-white/80 px-3 py-1 font-mono text-xs font-bold text-ink dark:bg-[#1f1f22]">
                      {lotId}
                    </code>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {productFacts.map(({ label, value, Icon }) => (
                    <div
                      key={label}
                      className="flex-1 basis-[120px] rounded-xl border border-white/80 bg-white/80 px-3 py-3 shadow-sm dark:border-line dark:bg-[#1f1f22]"
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <Icon
                          size={14}
                          className="shrink-0 text-emerald-700 dark:text-emerald-300"
                        />
                        <p className="truncate text-[10px] font-bold uppercase tracking-wide text-muted">
                          {label}
                        </p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-ink">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-line/70 pt-4 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 dark:bg-[#1f1f22]">
                    <ShieldCheck
                      size={13}
                      className="text-emerald-700 dark:text-emerald-300"
                    />
                    Dữ liệu truy xuất công khai
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 dark:bg-[#1f1f22]">
                    <Award
                      size={13}
                      className="text-emerald-700 dark:text-emerald-300"
                    />
                    {certificates.length > 0
                      ? `${certificates.length} chứng nhận`
                      : "Chưa có chứng nhận"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 dark:bg-[#1f1f22]">
                    <CheckCircle2
                      size={13}
                      className="text-emerald-700 dark:text-emerald-300"
                    />
                    {totalEvents > 0
                      ? `${totalEvents} sự kiện`
                      : "Chưa có sự kiện"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-8">
            <SectionCard icon={Info} title="Thông tin sản phẩm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {productInfo.map(({ Icon, label, value }) => (
                  <InfoTile
                    key={label}
                    Icon={Icon}
                    label={label}
                    value={value}
                  />
                ))}
              </div>

              {data.notes && data.notes.length >= 80 && (
                <div className="mt-3 rounded-xl border border-line bg-slate-50 p-4 dark:bg-[#1f1f22]">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Ghi chú
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink">
                    {data.notes}
                  </p>
                </div>
              )}
            </SectionCard>

            <SectionCard
              icon={Leaf}
              title="Hành trình nông sản"
              action={
                totalEvents > 0 ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-muted dark:bg-[#1f1f22]">
                    {totalEvents} sự kiện
                  </span>
                ) : null
              }
            >
              {sortedEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-slate-50 py-10 text-center dark:bg-[#171717]/50">
                  <Clock size={24} className="mx-auto mb-3 text-muted" />
                  <p className="text-sm font-medium text-muted">
                    Chưa có sự kiện nào được ghi nhận
                  </p>
                </div>
              ) : (
                <div className="relative pl-8">
                  <div className="absolute bottom-4 left-[17px] top-4 w-px bg-line" />
                  <div className="flex flex-col gap-4">
                    {sortedEvents.map((event, idx) => {
                      const cfg = getEventCfg(event.event_type);
                      const Icon = cfg.Icon;
                      const tone = eventToneClasses[cfg.tone];
                      const proof = proofMap.get(event.id) ?? null;
                      const isLast = idx === sortedEvents.length - 1;
                      const isCurrent = isLast && !isBatchDone;

                      return (
                        <div key={event.id} className="relative">
                          <div
                            className={cn(
                              "absolute -left-8 top-1 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-sm",
                              isCurrent
                                ? "border-emerald-500 bg-white dark:bg-panel"
                                : tone.node,
                            )}
                          >
                            {isCurrent ? (
                              <span className="h-3.5 w-3.5 rounded-full bg-emerald-600 shadow-[0_0_0_6px_rgba(16,185,129,0.15)] dark:bg-emerald-300" />
                            ) : (
                              <Icon size={15} className={tone.icon} />
                            )}
                          </div>

                          <div
                            className={cn(
                              "rounded-xl border p-4",
                              isCurrent
                                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                                : tone.card,
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-bold text-ink">
                                {cfg.label}
                                {isCurrent && (
                                  <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-emerald-400 dark:text-[#0d0d0f]">
                                    Hiện tại
                                  </span>
                                )}
                              </p>
                              {event.occurred_at && (
                                <time className="text-xs font-medium text-muted">
                                  {formatDateTime(event.occurred_at)}
                                </time>
                              )}
                            </div>

                            <div className="mt-2 flex flex-col gap-1.5 text-xs text-muted">
                              {event.location_name && (
                                <p className="flex items-center gap-1.5">
                                  <MapPin size={12} />
                                  <span>{event.location_name}</span>
                                </p>
                              )}
                              {event.shipment?.transporter_name && (
                                <p className="flex items-center gap-1.5">
                                  <Truck size={12} />
                                  <span>
                                    Vận chuyển bởi:{" "}
                                    {event.shipment.transporter_name}
                                  </span>
                                </p>
                              )}
                              {event.note && (
                                <p className="leading-relaxed text-muted">
                                  {event.note}
                                </p>
                              )}
                            </div>

                            {proof?.txHash && (
                              <a
                                href={`${polygonscanBaseUrl}/tx/${proof.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1 font-mono text-[10px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-panel dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                              >
                                <ExternalLink size={11} className="shrink-0" />
                                <span className="truncate">
                                  {shortHash(proof.txHash)}
                                </span>
                                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-sans text-[9px] uppercase text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                  {proof.status === "confirmed"
                                    ? "Xác minh"
                                    : proof.status === "pending"
                                      ? "Đang xử lý"
                                      : "Lỗi"}
                                </span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4">
            <SectionCard
              icon={Award}
              title="Chứng nhận"
              action={
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {certificates.length}
                </span>
              }
            >
              {certificates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-slate-50 py-8 text-center dark:bg-[#171717]/50">
                  <Award size={24} className="mx-auto mb-3 text-muted" />
                  <p className="text-sm font-medium text-muted">
                    Chưa có chứng nhận
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {certificates.map((cert) => {
                    const state = getCertificateState(cert.expires_at);
                    const CertIcon = getCertificateIcon(cert.certificate_type);

                    return (
                      <div
                        key={cert.id}
                        className={cn("rounded-xl border p-3.5", state.card)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                              state.icon,
                            )}
                          >
                            <CertIcon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-black text-ink">
                                {cert.certificate_type}
                              </p>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                  state.pill,
                                )}
                              >
                                {state.label}
                              </span>
                            </div>
                            <div className="mt-1 space-y-0.5 text-xs leading-relaxed text-muted">
                              {cert.issuer && (
                                <p className="truncate">{cert.issuer}</p>
                              )}
                              {cert.certificate_number && (
                                <p className="font-mono">
                                  Số: {cert.certificate_number}
                                </p>
                              )}
                              {(cert.issued_at || cert.expires_at) && (
                                <p>
                                  {formatDate(cert.issued_at)} -{" "}
                                  {formatDate(cert.expires_at)}
                                </p>
                              )}
                            </div>
                            {cert.file_url && (
                              <a
                                href={cert.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-300"
                              >
                                <FileText size={13} />
                                Xem tài liệu
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard icon={Building2} title="Nhà cung cấp">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/30 dark:bg-panel dark:text-emerald-300">
                  <Building2 size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-ink">{supplierName}</p>
                  {(supplier as any)?.certification_summary && (
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {(supplier as any).certification_summary}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 text-sm text-ink">
                {supplierAddress && supplierAddress !== "—" && (
                  <SupplierLine Icon={MapPin} value={supplierAddress} />
                )}
                {(supplier as any)?.phone && (
                  <SupplierLine Icon={Phone} value={(supplier as any).phone} />
                )}
                {(supplier as any)?.contact_email && (
                  <SupplierLine
                    Icon={Mail}
                    value={(supplier as any).contact_email}
                    href={`mailto:${(supplier as any).contact_email}`}
                  />
                )}
                {(supplier as any)?.website && (
                  <SupplierLine
                    Icon={Globe}
                    value={(supplier as any).website.replace(
                      /^https?:\/\//,
                      "",
                    )}
                    href={
                      (supplier as any).website.startsWith("http")
                        ? (supplier as any).website
                        : `https://${(supplier as any).website}`
                    }
                  />
                )}
              </div>
            </SectionCard>
          </div>
        </div>

        <section
          className={cn(
            "rounded-2xl border p-5 shadow-card sm:p-6",
            blockchainState.card,
          )}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                  blockchainState.icon,
                )}
              >
                {tampered ? <AlertTriangle size={22} /> : <Shield size={22} />}
              </div>
              <div>
                <p className="text-lg font-black text-ink">
                  {blockchainState.title}
                </p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                  {blockchainState.description}
                </p>
              </div>
            </div>

            {txHash && (
              <div className="min-w-0 rounded-xl border border-line bg-white/80 p-3 dark:bg-panel/80 lg:w-[360px]">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                  TX Hash
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2.5 py-2 font-mono text-xs font-bold text-ink dark:bg-[#1f1f22]">
                    {shortHash(txHash)}
                  </code>
                  {polygonscanUrl && (
                    <a
                      href={polygonscanUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                      title="Xem trên Polygonscan"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[10px] font-semibold text-muted">
                    <span>Tính toàn vẹn dữ liệu</span>
                    <span className="text-emerald-700 dark:text-emerald-300">
                      {integrityPct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-[#1f1f22]">
                    <div
                      className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                      style={{ width: `${integrityPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col items-stretch justify-center gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
          <a
            href={`/api/public/trace/${lotId}/pdf`}
            className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-700 px-7 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 dark:bg-emerald-400 dark:text-[#0d0d0f] dark:hover:bg-emerald-300"
          >
            <Download size={18} />
            Tải PDF Biên Bản
          </a>
          <ShareButton
            url={shareUrl}
            title={`${productName} - ${lotId} | BlueFood`}
          />
        </section>

        <p className="pb-2 text-center text-xs text-muted">
          Dữ liệu truy xuất được cung cấp bởi{" "}
          <span className="font-bold text-emerald-700 dark:text-emerald-300">
            BlueFood
          </span>{" "}
          - được bảo vệ bởi công nghệ blockchain.
        </p>
      </main>
    </TraceShell>
  );
}

function SectionCard({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 shadow-card dark:bg-panel sm:p-6">
      <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Icon size={18} />
        </div>
        <h2 className="text-base font-black text-ink">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function InfoTile({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-line bg-slate-50 p-3 dark:bg-[#1f1f22]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel text-emerald-700 dark:text-emerald-300">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold leading-snug text-ink">
          {value}
        </p>
      </div>
    </div>
  );
}

function SupplierLine({
  Icon,
  value,
  href,
}: {
  Icon: LucideIcon;
  value: string;
  href?: string;
}) {
  const content = href ? (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="break-words hover:text-emerald-700 hover:underline dark:hover:text-emerald-300"
    >
      {value}
    </a>
  ) : (
    <span className="break-words">{value}</span>
  );

  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-muted" />
      <div className="min-w-0 leading-relaxed text-muted">{content}</div>
    </div>
  );
}

function TraceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-md dark:border-[#2a2a2d] dark:bg-[#101011]/95 dark:shadow-none">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-emerald-100 dark:bg-[#1a3c2e] dark:text-emerald-300 sm:h-9 sm:w-9">
              <Leaf size={17} />
            </div>
            <span className="text-base font-black tracking-normal text-brand dark:text-emerald-300 sm:text-xl">
              BlueFood
            </span>
          </div>

          <div className="flex shrink items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-ink shadow-sm dark:border-[#2a2a2d] dark:bg-[#171717] dark:text-[#f5f5f5] sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm">
            <ShieldCheck
              size={12}
              className="shrink-0 text-emerald-700 dark:text-emerald-300 sm:size-[15px]"
            />
            <span className="whitespace-nowrap">Truy xuất nguồn gốc</span>
          </div>

          <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-black text-ink shadow-sm dark:border-[#2a2a2d] dark:bg-[#171717] dark:text-[#f5f5f5] sm:gap-1.5 sm:px-3 sm:text-xs">
            <Globe
              size={13}
              className="text-emerald-700 dark:text-emerald-300"
            />
            <span>VI/EN</span>
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-6 border-t border-line bg-panel py-5 dark:bg-bg">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-xs text-muted sm:flex-row">
          <span>© 2026 BlueFood - Hệ thống truy xuất nguồn gốc thực phẩm</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck
              size={12}
              className="text-emerald-700 dark:text-emerald-300"
            />
            Bảo vệ bởi Blockchain
          </span>
        </div>
      </footer>
    </div>
  );
}
