import React from 'react';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { statusForCertificate } from '@/lib/portal';
import { formatDateTime } from '@/lib/utils';
import {
  Package, Truck, QrCode, AlertTriangle,
  LayoutList, Activity, ShieldCheck, Home,
  Route, Leaf, ChevronRight, CheckCircle2,
  Calendar, Building2, Plus,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClickableTableRow } from '@/components/clickable-table-row';
import type { BatchStatus } from '@bluefood/shared';
import { BATCH_STATUS_LABELS } from '@bluefood/shared';

/* ── Status badge style map ──────────────────────────────────────── */
const STATUS_STYLE: Record<string, string> = {
  draft:             'bg-blue-50 text-blue-700 border-blue-200 dark:bg-[rgba(173,198,255,0.10)] dark:text-[#adc6ff] dark:border-[rgba(173,198,255,0.30)]',
  created:           'bg-blue-50 text-blue-700 border-blue-200 dark:bg-[rgba(173,198,255,0.10)] dark:text-[#adc6ff] dark:border-[rgba(173,198,255,0.30)]',
  harvested:         'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[rgba(34,197,94,0.10)] dark:text-[#22c55e] dark:border-[rgba(34,197,94,0.30)]',
  packed:            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[rgba(34,197,94,0.10)] dark:text-[#22c55e] dark:border-[rgba(34,197,94,0.30)]',
  quality_checked:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[rgba(34,197,94,0.12)] dark:text-[#22c55e] dark:border-[rgba(34,197,94,0.35)]',
  in_transit:        'bg-purple-50 text-purple-700 border-purple-200 dark:bg-[rgba(221,183,255,0.10)] dark:text-[#ddb7ff] dark:border-[rgba(221,183,255,0.30)]',
  received_at_store: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-[rgba(34,197,94,0.15)] dark:text-[#22c55e] dark:border-[rgba(34,197,94,0.40)]',
  sold:              'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[rgba(34,197,94,0.10)] dark:text-[#22c55e] dark:border-[rgba(34,197,94,0.30)]',
  recalled:          'bg-red-50 text-red-700 border-red-200 dark:bg-[rgba(255,180,171,0.10)] dark:text-[#ffb4ab] dark:border-[rgba(255,180,171,0.30)]',
  cancelled:         'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[rgba(173,198,255,0.10)] dark:text-[#adc6ff] dark:border-[rgba(173,198,255,0.30)]',
};

/* ── Data fetching ───────────────────────────────────────────────── */
function buildStatusCounts(batches: { status: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const b of batches) counts[b.status] = (counts[b.status] ?? 0) + 1;
  return counts;
}

type BatchStatusRow = { status: string };
type CertificateExpiryRow = { expires_at: string | null; status?: string | null };

async function getDashboardData(role: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createSupabaseServiceClient();
  const batchStatusQuery = service.from('batches').select('status');
  const recentBatchesQuery = service
    .from('batches')
    .select('batch_code, status, products(name), suppliers(name), updated_at')
    .order('updated_at', { ascending: false })
    .limit(6);
  const auditQuery = service
    .from('audit_logs')
    .select('id, action, entity_type, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(8);
  const certsQuery = service.from('certificates').select('expires_at, status');

  if (role === 'admin') {
    const [batchesRes, recentRes, auditRes, scanRes, certsRes] = await Promise.all([
      batchStatusQuery,
      recentBatchesQuery,
      auditQuery,
      service
        .from('qr_scan_logs')
        .select('id', { count: 'exact', head: true })
        .gte('scanned_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      certsQuery,
    ]);

    const batches      = (batchesRes.data ?? []) as BatchStatusRow[];
    const certs        = (certsRes.data ?? []) as CertificateExpiryRow[];
    const activeBatches = batches.filter((b) => !['sold', 'recalled', 'cancelled'].includes(b.status)).length;
    const inTransit    = batches.filter((b) => b.status === 'in_transit').length;
    const validCerts   = certs.filter((c) => statusForCertificate(c.expires_at, c.status) === 'active').length;
    const expiringSoon = certs.filter((c) => statusForCertificate(c.expires_at, c.status) === 'expiring').length;

    return {
      role: 'admin' as const,
      activeBatches,
      inTransit,
      qrScansThisMonth: scanRes.count ?? 0,
      expiringSoon,
      validCerts,
      batchStatusCounts: buildStatusCounts(batches),
      totalBatches: batches.length,
      recentBatches: recentRes.data ?? [],
      auditLogs: auditRes.data ?? [],
    };
  }

  const [batchesRes, recentRes, auditRes, certsRes] = await Promise.all([
    batchStatusQuery, recentBatchesQuery, auditQuery, certsQuery,
  ]);

  const batches      = (batchesRes.data ?? []) as BatchStatusRow[];
  const certs        = (certsRes.data ?? []) as CertificateExpiryRow[];
  const activeBatches = batches.filter((b) => !['sold', 'recalled', 'cancelled'].includes(b.status)).length;
  const inTransit    = batches.filter((b) => b.status === 'in_transit').length;
  const validCerts   = certs.filter((c) => statusForCertificate(c.expires_at, c.status) === 'active').length;
  const expiringSoon = certs.filter((c) => statusForCertificate(c.expires_at, c.status) === 'expiring').length;

  return {
    role: 'store_staff' as const,
    activeBatches,
    inTransit,
    validCerts,
    expiringSoon,
    batchStatusCounts: buildStatusCounts(batches),
    totalBatches: batches.length,
    recentBatches: recentRes.data ?? [],
    auditLogs: auditRes.data ?? [],
  };
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const ACTION_STYLE: Record<string, string> = {
  insert: 'text-emerald-700 bg-emerald-50 dark:text-[#22c55e] dark:bg-[rgba(34,197,94,0.10)]',
  update: 'text-amber-700 bg-amber-50 dark:text-[#ffb77a] dark:bg-[rgba(255,183,122,0.10)]',
  delete: 'text-red-700 bg-red-50 dark:text-[#ffb4ab] dark:bg-[rgba(255,180,171,0.10)]',
};

function timeAgo(value: string) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

/* ── Pipeline stage definitions ──────────────────────────────────── */
const PIPELINE_STAGES = [
  { key: 'created',           label: 'Tạo lô',     Icon: Plus         },
  { key: 'harvested',         label: 'Thu hoạch',   Icon: Leaf         },
  { key: 'in_transit',        label: 'Vận chuyển',  Icon: Truck        },
  { key: 'received_at_store', label: 'Nhận hàng',   Icon: Building2    },
  { key: 'sold',              label: 'Đã bán',      Icon: CheckCircle2 },
] as const;

/* ── Decorative mini bar sparkline ───────────────────────────────── */
function MiniBarChart({ bars, color }: { bars: readonly number[]; color: string }) {
  return (
    <div className="flex items-end gap-[3px] h-10 w-16 flex-shrink-0">
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            height: `${h}%`,
            backgroundColor: color,
            opacity: 0.25 + (i / (bars.length - 1)) * 0.75,
          }}
          className="flex-1 rounded-[2px] min-h-[3px]"
        />
      ))}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default async function DashboardPage() {
  const profile = await getProfile();
  const role    = profile?.role ?? 'store_staff';
  const data    = await getDashboardData(role);

  const expWarn = data.expiringSoon > 0;

  /* Decorative bar patterns — visual only, not real historical data */
  const BARS_BLUE:   readonly number[] = [45, 58, 52, 72, 65, 78, 70];
  const BARS_PURPLE: readonly number[] = [35, 48, 42, 60, 50, 58, 72];
  const BARS_ORANGE: readonly number[] = [55, 42, 68, 58, 74, 62, 88];
  const BARS_AMBER:  readonly number[] = [20, 35, 28, 48, 38, 52, 45];
  const BARS_RED:    readonly number[] = [22, 38, 30, 50, 42, 60, 55];

  const kpiCards = data.role === 'admin'
    ? [
        {
          label: 'Lô hàng hoạt động',
          value: data.activeBatches.toLocaleString('vi-VN'),
          Icon: Package,
          footer: `trong ${data.totalBatches} lô tổng cộng`,
          bars: BARS_BLUE,
          barColor: '#60a5fa',
          iconBg: 'bg-blue-100 dark:bg-[rgba(96,165,250,0.14)]',
          iconColor: 'text-blue-600 dark:text-[#60a5fa]',
          valueCls: 'admin-ink',
          footerCls: 'admin-muted',
          borderCls: 'border-line dark:border-[#2a2a2d]',
          bgCls: 'bg-panel dark:bg-[#171717]',
        },
        {
          label: 'Đang vận chuyển',
          value: data.inTransit.toLocaleString('vi-VN'),
          Icon: Truck,
          footer: 'lô đang trên đường',
          bars: BARS_PURPLE,
          barColor: '#a78bfa',
          iconBg: 'bg-purple-100 dark:bg-[rgba(167,139,250,0.14)]',
          iconColor: 'text-purple-600 dark:text-[#a78bfa]',
          valueCls: 'admin-ink',
          footerCls: 'admin-muted',
          borderCls: 'border-line dark:border-[#2a2a2d]',
          bgCls: 'bg-panel dark:bg-[#171717]',
        },
        {
          label: 'Lượt quét QR tháng này',
          value: data.qrScansThisMonth >= 1000
            ? `${(data.qrScansThisMonth / 1000).toFixed(1)}K`
            : data.qrScansThisMonth.toLocaleString('vi-VN'),
          Icon: QrCode,
          footer: 'lượt quét trong tháng',
          bars: BARS_ORANGE,
          barColor: '#fb923c',
          iconBg: 'bg-orange-100 dark:bg-[rgba(251,146,60,0.14)]',
          iconColor: 'text-orange-600 dark:text-[#fb923c]',
          valueCls: 'admin-ink',
          footerCls: 'admin-muted',
          borderCls: 'border-line dark:border-[#2a2a2d]',
          bgCls: 'bg-panel dark:bg-[#171717]',
        },
        {
          label: 'Chứng chỉ sắp hết hạn',
          value: data.expiringSoon.toLocaleString('vi-VN'),
          Icon: AlertTriangle,
          footer: expWarn ? 'cần kiểm tra ngay' : 'trong 30 ngày tới',
          bars: expWarn ? BARS_RED : BARS_AMBER,
          barColor: expWarn ? '#f87171' : '#fbbf24',
          iconBg: expWarn
            ? 'bg-red-100 dark:bg-[rgba(248,113,113,0.14)]'
            : 'bg-amber-100 dark:bg-[rgba(251,191,36,0.14)]',
          iconColor: expWarn
            ? 'text-red-600 dark:text-[#f87171]'
            : 'text-amber-600 dark:text-[#fbbf24]',
          valueCls: expWarn ? 'text-red-700 dark:text-[#f87171]' : 'admin-ink',
          footerCls: expWarn ? 'text-red-600 dark:text-[#f87171]' : 'admin-muted',
          borderCls: expWarn
            ? 'border-red-200 dark:border-[rgba(248,113,113,0.22)]'
            : 'border-line dark:border-[#2a2a2d]',
          bgCls: expWarn
            ? 'bg-red-50/40 dark:bg-[rgba(248,113,113,0.04)]'
            : 'bg-panel dark:bg-[#171717]',
        },
      ]
    : [
        {
          label: 'Lô hàng hoạt động',
          value: data.activeBatches.toLocaleString('vi-VN'),
          Icon: Package,
          footer: `trong ${data.totalBatches} lô tổng cộng`,
          bars: BARS_BLUE,
          barColor: '#60a5fa',
          iconBg: 'bg-blue-100 dark:bg-[rgba(96,165,250,0.14)]',
          iconColor: 'text-blue-600 dark:text-[#60a5fa]',
          valueCls: 'admin-ink',
          footerCls: 'admin-muted',
          borderCls: 'border-line dark:border-[#2a2a2d]',
          bgCls: 'bg-panel dark:bg-[#171717]',
        },
        {
          label: 'Đang vận chuyển',
          value: data.inTransit.toLocaleString('vi-VN'),
          Icon: Truck,
          footer: 'lô đang trên đường',
          bars: BARS_PURPLE,
          barColor: '#a78bfa',
          iconBg: 'bg-purple-100 dark:bg-[rgba(167,139,250,0.14)]',
          iconColor: 'text-purple-600 dark:text-[#a78bfa]',
          valueCls: 'admin-ink',
          footerCls: 'admin-muted',
          borderCls: 'border-line dark:border-[#2a2a2d]',
          bgCls: 'bg-panel dark:bg-[#171717]',
        },
        {
          label: 'Chứng chỉ hiệu lực',
          value: data.validCerts.toLocaleString('vi-VN'),
          Icon: ShieldCheck,
          footer: 'chứng chỉ còn hiệu lực',
          bars: BARS_ORANGE,
          barColor: '#fb923c',
          iconBg: 'bg-orange-100 dark:bg-[rgba(251,146,60,0.14)]',
          iconColor: 'text-orange-600 dark:text-[#fb923c]',
          valueCls: 'admin-ink',
          footerCls: 'admin-muted',
          borderCls: 'border-line dark:border-[#2a2a2d]',
          bgCls: 'bg-panel dark:bg-[#171717]',
        },
        {
          label: 'Chứng chỉ sắp hết hạn',
          value: data.expiringSoon.toLocaleString('vi-VN'),
          Icon: AlertTriangle,
          footer: expWarn ? 'cần kiểm tra ngay' : 'trong 30 ngày tới',
          bars: expWarn ? BARS_RED : BARS_AMBER,
          barColor: expWarn ? '#f87171' : '#fbbf24',
          iconBg: expWarn
            ? 'bg-red-100 dark:bg-[rgba(248,113,113,0.14)]'
            : 'bg-amber-100 dark:bg-[rgba(251,191,36,0.14)]',
          iconColor: expWarn
            ? 'text-red-600 dark:text-[#f87171]'
            : 'text-amber-600 dark:text-[#fbbf24]',
          valueCls: expWarn ? 'text-red-700 dark:text-[#f87171]' : 'admin-ink',
          footerCls: expWarn ? 'text-red-600 dark:text-[#f87171]' : 'admin-muted',
          borderCls: expWarn
            ? 'border-red-200 dark:border-[rgba(248,113,113,0.22)]'
            : 'border-line dark:border-[#2a2a2d]',
          bgCls: expWarn
            ? 'bg-red-50/40 dark:bg-[rgba(248,113,113,0.04)]'
            : 'bg-panel dark:bg-[#171717]',
        },
      ];

  /* Navigation targets for metric cards (positional, matches kpiCards order) */
  const kpiHrefs = data.role === 'admin'
    ? ['/batches', '/shipments', '/reports', '/certificates']
    : ['/batches', '/shipments', '/certificates', '/certificates'];

  /* Navigation targets for pipeline stage nodes */
  const PIPELINE_ROUTES: Record<string, string> = {
    created:           '/batches',
    harvested:         '/batches',
    in_transit:        '/shipments',
    received_at_store: '/batches',
    sold:              '/batches',
  };

  const soldCount = data.batchStatusCounts['sold'] ?? 0;
  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });

  /* Build pipeline nodes */
  const pipelineNodes: React.ReactNode[] = [];
  PIPELINE_STAGES.forEach(({ key, label, Icon }, i) => {
    const count  = data.batchStatusCounts[key] ?? 0;
    const isLive = key === 'in_transit' && count > 0;
    const isDone = key === 'sold';

    pipelineNodes.push(
      <Link
        key={key}
        href={PIPELINE_ROUTES[key] ?? '/batches'}
        className={[
          'flex-1 min-w-0 flex flex-col items-center gap-2 px-3 py-4 rounded-xl border text-center',
          'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]',
          isLive
            ? 'border-[rgba(34,197,94,0.40)] bg-[rgba(34,197,94,0.06)] dark:border-[rgba(34,197,94,0.35)] dark:bg-[rgba(34,197,94,0.07)] hover:border-[rgba(34,197,94,0.65)] dark:hover:border-[rgba(34,197,94,0.55)]'
            : 'border-slate-200/70 bg-white/50 dark:border-[rgba(255,255,255,0.07)] dark:bg-[rgba(255,255,255,0.025)] hover:border-slate-300 dark:hover:border-[rgba(255,255,255,0.14)]',
        ].join(' ')}
      >
        <div className={[
          'w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-110',
          isLive
            ? 'bg-[rgba(34,197,94,0.18)] text-emerald-700 dark:text-[#22c55e]'
            : isDone
            ? 'bg-slate-100 dark:bg-[#1f1f22] text-emerald-600 dark:text-[#22c55e]'
            : 'bg-slate-100 dark:bg-[#1f1f22] text-slate-400 dark:text-[#737373]',
        ].join(' ')}>
          <Icon size={17} strokeWidth={1.8} />
        </div>
        <p className={`text-3xl font-black leading-none ${
          count > 0 ? 'text-ink dark:text-[#f5f5f5]' : 'text-slate-300 dark:text-[#3a3a3d]'
        }`}>
          {count}
        </p>
        <p className="text-[11px] font-semibold text-muted dark:text-[#737373] leading-tight whitespace-nowrap">{label}</p>
        {isLive && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[9px] text-[#22c55e] font-bold uppercase tracking-wide">Live</span>
          </div>
        )}
      </Link>,
    );

    if (i < PIPELINE_STAGES.length - 1) {
      pipelineNodes.push(
        <div key={`sep-${i}`} className="flex items-center self-center flex-shrink-0">
          <div className="w-8 h-px bg-slate-200 dark:bg-[#2a2a2d]" />
          <ChevronRight size={13} className="text-slate-300 dark:text-[#3f3f42] -ml-1" />
        </div>,
      );
    }
  });

  /* Blockchain / verification node (uses validCerts count) */
  pipelineNodes.push(
    <div key="sep-blockchain" className="flex items-center self-center flex-shrink-0">
      <div
        className="w-8 h-px"
        style={{ borderTop: '1px dashed rgba(34,197,94,0.45)' }}
      />
      <ChevronRight size={13} className="text-[rgba(34,197,94,0.55)] -ml-1" />
    </div>,
  );
  pipelineNodes.push(
    <Link
      key="blockchain"
      href="/certificates"
      className={[
        'flex-1 min-w-0 flex flex-col items-center gap-2 px-3 py-4 rounded-xl border text-center',
        'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]',
        'border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.05)]',
        'dark:border-[rgba(34,197,94,0.25)] dark:bg-[rgba(34,197,94,0.06)]',
        'hover:border-[rgba(34,197,94,0.55)] dark:hover:border-[rgba(34,197,94,0.45)]',
      ].join(' ')}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(34,197,94,0.14)] text-emerald-700 dark:text-[#22c55e] transition-transform duration-150 hover:scale-110">
        <ShieldCheck size={17} strokeWidth={1.8} />
      </div>
      <p className={`text-3xl font-black leading-none ${
        data.validCerts > 0 ? 'text-ink dark:text-[#f5f5f5]' : 'text-slate-300 dark:text-[#3a3a3d]'
      }`}>
        {data.validCerts}
      </p>
      <p className="text-[11px] font-semibold text-muted dark:text-[#737373] leading-tight whitespace-nowrap">Xác thực</p>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
        <span className="text-[9px] text-[#22c55e] font-bold uppercase tracking-wide">Cert</span>
      </div>
    </Link>,
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="admin-breadcrumb">
            <Home size={13} />
            <span>/</span>
            <span className="admin-breadcrumb-current">Tổng quan</span>
          </div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="text-sm admin-muted mt-0.5">Giám sát toàn bộ chuỗi cung ứng thực phẩm</p>
        </div>
        <div className="hidden lg:flex items-center gap-2 text-xs admin-muted border border-line dark:border-[#2a2a2d] rounded-lg px-3 py-2 mt-6 flex-shrink-0">
          <Calendar size={12} />
          {todayLabel}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, Icon, footer, bars, barColor, iconBg, iconColor, valueCls, footerCls, borderCls, bgCls }, idx) => (
          <Link
            key={label}
            href={kpiHrefs[idx]}
            className={[
              'group rounded-2xl border p-5 flex flex-col gap-3',
              'transition-all duration-200 hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0d0d0f]',
              bgCls,
              borderCls,
            ].join(' ')}
          >
            {/* Label + icon */}
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${iconBg}`}>
                <Icon size={17} strokeWidth={1.8} className={iconColor} />
              </div>
              <span className="text-[12px] font-medium admin-muted leading-snug">{label}</span>
            </div>
            {/* Value + sparkline */}
            <div className="flex items-end justify-between gap-2">
              <p className={`text-4xl font-black leading-none ${valueCls}`}>{value}</p>
              <MiniBarChart bars={bars} color={barColor} />
            </div>
            {/* Footer + arrow hint */}
            <div className="flex items-center justify-between">
              <p className={`text-[11px] ${footerCls}`}>{footer}</p>
              <ChevronRight size={12} className="admin-muted flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Supply chain pipeline — full width ── */}
      <div className="rounded-2xl border border-line dark:border-[#2a2a2d] overflow-hidden">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-line dark:border-[#2a2a2d] bg-slate-50 dark:bg-[#111113] flex items-center justify-between">
          <h3 className="text-[13px] font-semibold flex items-center gap-2 admin-ink">
            <Route size={15} className="text-brand dark:text-[#22c55e]" />
            Luồng chuỗi cung ứng
          </h3>
          <span className="text-[11px] admin-muted">{data.totalBatches} lô tổng cộng</span>
        </div>

        {/* Canvas area — nodes expand to fill full width, dot grid in dark mode */}
        <div
          className="px-5 py-6 bg-white dark:bg-[#0d0d0f]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* flex items stretch to fill: nodes flex-1, connectors shrink-0 */}
          <div className="flex items-center gap-1">
            {pipelineNodes}
          </div>
        </div>

        {/* Bottom summary bar */}
        <div className="px-5 py-4 border-t border-line dark:border-[#2a2a2d] bg-slate-50 dark:bg-[#111113] grid grid-cols-3 divide-x divide-line dark:divide-[#2a2a2d]">
          <div className="pr-5">
            <p className="text-[10px] font-bold uppercase tracking-wider admin-muted mb-1">Đang hoạt động</p>
            <p className="text-2xl font-black admin-ink leading-tight">{data.activeBatches}</p>
            <p className="text-[10px] admin-muted mt-0.5">lô chưa hoàn thành</p>
          </div>
          <div className="px-5">
            <p className="text-[10px] font-bold uppercase tracking-wider admin-muted mb-1">Hoàn thành</p>
            <p className="text-2xl font-black admin-ink leading-tight">{soldCount}</p>
            <p className="text-[10px] admin-muted mt-0.5">lô đã bán</p>
          </div>
          <div className="pl-5">
            <p className="text-[10px] font-bold uppercase tracking-wider admin-muted mb-1">Chứng chỉ HV</p>
            <p className="text-2xl font-black admin-ink leading-tight">{data.validCerts}</p>
            <p className="text-[10px] admin-muted mt-0.5">còn hiệu lực</p>
          </div>
        </div>
      </div>

      {/* ── Bottom row: latest batches (left) + activity feed (right) ── */}
      {/* No items-start — both columns stretch to the same row height */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] gap-6">

        {/* Latest batches — flex-col so the card fills row height cleanly */}
        <div className="admin-card flex flex-col min-w-0">
          <div className="admin-card-toolbar flex-shrink-0 px-5 py-4 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold flex items-center gap-2 admin-ink">
              <LayoutList size={15} className="text-brand dark:text-[#22c55e]" />
              Lô hàng mới nhất
            </h3>
            <Link href="/batches" className="text-[12px] font-semibold text-brand dark:text-[#d4d4d4] hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="admin-table-head-row">
                  {['Mã lô', 'Sản phẩm', 'Trạng thái', 'Cập nhật'].map((h) => (
                    <th key={h} className="admin-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentBatches.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm admin-muted">
                      Chưa có lô hàng nào
                    </td>
                  </tr>
                ) : (
                  data.recentBatches.map((batch: any) => {
                    const bStatus = batch.status as BatchStatus;
                    const badge   = STATUS_STYLE[bStatus] ?? STATUS_STYLE.created;
                    const detailHref = `/batches/${batch.batch_code}`;
                    return (
                      <ClickableTableRow
                        key={batch.batch_code}
                        href={detailHref}
                        className="admin-row group"
                      >
                        <td className="px-5 py-3">
                          <span className="admin-link font-mono text-xs font-semibold">
                            {batch.batch_code}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="admin-ink text-sm leading-snug">
                            {(batch.products as any)?.name ?? '—'}
                          </p>
                          <p className="admin-muted text-[11px] mt-0.5">
                            {(batch.suppliers as any)?.name ?? '—'}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge}`}>
                            {BATCH_STATUS_LABELS[bStatus] ?? bStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="admin-muted text-[12px]">{formatDateTime(batch.updated_at)}</span>
                            <ChevronRight size={13} className="flex-shrink-0 text-[#22c55e] opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0 transition-all duration-150" />
                          </div>
                        </td>
                      </ClickableTableRow>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity feed — flex-col with scrollable list fills same row height */}
        <div className="rounded-2xl border border-line dark:border-[#2a2a2d] bg-panel dark:bg-[#171717] flex flex-col overflow-hidden min-w-0">
          <div className="flex-shrink-0 px-4 py-4 border-b border-line dark:border-[#2a2a2d] bg-slate-50 dark:bg-[#111113]">
            <h3 className="text-[13px] font-semibold flex items-center gap-2 admin-ink">
              <Activity size={15} className="text-brand dark:text-[#22c55e]" />
              Hoạt động gần đây
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2a2a2d]">
            {data.auditLogs.length === 0 ? (
              <p className="text-sm text-center py-10 admin-muted">Chưa có log</p>
            ) : (
              data.auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2.5 px-4 py-3 hover:bg-[var(--color-surface-2)] dark:hover:bg-[#1f1f22] transition-colors"
                >
                  <span className={[
                    'flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase',
                    ACTION_STYLE[log.action] ?? 'text-muted bg-[var(--color-surface-2)] dark:text-[#9ca3af] dark:bg-[rgba(255,255,255,0.06)]',
                  ].join(' ')}>
                    {log.action}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium truncate admin-ink">{log.summary}</p>
                    <p className="text-[10px] admin-muted mt-0.5">
                      {log.entity_type} · {timeAgo(log.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex-shrink-0 p-3 border-t border-line dark:border-[#2a2a2d]">
            <Link
              href="/audit-logs"
              className="w-full py-2 rounded-lg border border-line text-xs font-semibold text-center block admin-muted hover:bg-[var(--color-surface-2)] dark:border-[#2a2a2d] dark:hover:bg-[#1f1f22] transition-colors"
            >
              Xem tất cả nhật ký →
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
