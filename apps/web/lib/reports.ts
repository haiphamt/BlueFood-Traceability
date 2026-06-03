export type ReportGranularity = 'week' | 'month' | 'year';

export interface ReportFilters {
  period: string;
  from?: string;
  to?: string;
  granularity: ReportGranularity;
  gte?: string;
  lt?: string;
  label: string;
  exportQuery: string;
}

const GRANULARITIES = new Set<ReportGranularity>(['week', 'month', 'year']);

function parseDateInput(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(input?: string) {
  if (!input) return null;
  return new Date(`${input}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function periodRange(period: string, now = new Date()) {
  if (period === '7d') {
    return {
      gte: new Date(now.getTime() - 7 * 86_400_000).toISOString(),
      label: '7 ngày qua',
    };
  }

  if (period === '30d') {
    return {
      gte: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
      label: '30 ngày qua',
    };
  }

  if (period === '2026' || period === 'year') {
    const year = now.getUTCFullYear();
    return {
      gte: `${year}-01-01T00:00:00.000Z`,
      lt: `${year + 1}-01-01T00:00:00.000Z`,
      label: `Năm ${year}`,
    };
  }

  return { label: 'Tất cả thời gian' };
}

export function parseReportFilters(searchParams: URLSearchParams): ReportFilters {
  const period = searchParams.get('period') ?? '';
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const granularityParam = searchParams.get('granularity') as ReportGranularity | null;
  const granularity = granularityParam && GRANULARITIES.has(granularityParam) ? granularityParam : 'month';

  const fromDate = parseDateInput(from);
  const toDate = parseDateInput(to);
  const params = new URLSearchParams();
  params.set('granularity', granularity);

  if (fromDate || toDate) {
    const gte = fromDate?.toISOString();
    const lt = toDate ? addDays(toDate, 1).toISOString() : undefined;
    if (fromDate) params.set('from', formatInputDate(fromDate));
    if (toDate) params.set('to', formatInputDate(toDate));

    const fromLabel = fromDate ? formatDisplayDate(formatInputDate(fromDate)) : 'đầu kỳ';
    const toLabel = toDate ? formatDisplayDate(formatInputDate(toDate)) : 'hiện tại';

    return {
      period: '',
      from: fromDate ? formatInputDate(fromDate) : undefined,
      to: toDate ? formatInputDate(toDate) : undefined,
      granularity,
      gte,
      lt,
      label: `${fromLabel} - ${toLabel}`,
      exportQuery: params.toString(),
    };
  }

  const range = periodRange(period);
  if (period) params.set('period', period);

  return {
    period,
    granularity,
    gte: range.gte,
    lt: range.lt,
    label: range.label,
    exportQuery: params.toString(),
  };
}

export function reportPeriodHref(input: {
  period?: string;
  from?: string;
  to?: string;
  granularity?: ReportGranularity;
}) {
  const params = new URLSearchParams();
  if (input.period) params.set('period', input.period);
  if (input.from) params.set('from', input.from);
  if (input.to) params.set('to', input.to);
  if (input.granularity) params.set('granularity', input.granularity);
  const query = params.toString();
  return `/reports${query ? `?${query}` : ''}`;
}

export function groupDate(value: string | null | undefined, granularity: ReportGranularity) {
  if (!value) return 'Không rõ';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không rõ';

  const year = date.getUTCFullYear();
  if (granularity === 'year') return String(year);

  const month = date.getUTCMonth() + 1;
  if (granularity === 'month') return `${year}-${String(month).padStart(2, '0')}`;

  const day = date.getUTCDay() || 7;
  const monday = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate() - day + 1));
  const sunday = addDays(monday, 6);
  const start = monday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  const end = sunday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  return `${monday.getUTCFullYear()} W${weekOfYear(monday)} (${start}-${end})`;
}

function weekOfYear(date: Date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return String(Math.ceil((((target.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)).padStart(2, '0');
}

export function toNumber(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function shipmentCode(id: string) {
  return 'TRK-' + id.replace(/-/g, '').slice(0, 4).toUpperCase();
}

export function daysBetween(start: string | Date, end = new Date()) {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  return Math.ceil((end.getTime() - startDate.getTime()) / 86_400_000);
}
