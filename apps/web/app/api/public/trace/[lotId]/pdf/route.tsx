/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { getPublicTraceData } from '@/lib/trace';

const _require = createRequire(import.meta.url);

export const runtime = 'nodejs';

// ─── Brand palette ────────────────────────────────────────────
const C = {
  brand:        '#1a3c2e',
  green:        '#286b3f',
  greenLight:   '#f0fdf4',
  greenBorder:  '#86efac',
  blue:         '#eef4ff',
  border:       '#c2c8c1',
  borderLight:  '#e4ece5',
  dark:         '#121c28',
  med:          '#424843',
  light:        '#727973',
  white:        '#ffffff',
  warn:         '#fff8ee',
  warnText:     '#7c4700',
  danger:       '#fff1f0',
  dangerText:   '#93000a',
  gray:         '#f4f6f4',
  grayText:     '#475569',
  infoText:     '#1d4ed8',
};

// ─── Label maps ───────────────────────────────────────────────
const EVENT_LABELS: Record<string, string> = {
  created:           'Tạo lô hàng',
  harvested:         'Thu hoạch',
  packed:            'Đóng gói',
  quality_checked:   'Kiểm tra chất lượng',
  pickup:            'Xuất kho',
  in_transit:        'Vận chuyển',
  delivered:         'Giao đến điểm nhận',
  received_at_store: 'Nhận tại cửa hàng',
  sold:              'Đã bán',
  issue_reported:    'Báo cáo sự cố',
  recalled:          'Thu hồi lô hàng',
  correction:        'Điều chỉnh',
};

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  created:           { label: 'Đã tạo',           bg: '#f1f5f9', text: '#475569' },
  harvested:         { label: 'Đã thu hoạch',      bg: '#f0fdf4', text: '#166534' },
  packed:            { label: 'Đã đóng gói',       bg: '#f0fdf4', text: '#166534' },
  quality_checked:   { label: 'Đã kiểm tra CL',    bg: '#eff6ff', text: '#1d4ed8' },
  in_transit:        { label: 'Đang vận chuyển',   bg: '#fff8ee', text: '#7c4700' },
  received_at_store: { label: 'Đã nhận tại CH',    bg: '#f0fdf4', text: '#166534' },
  sold:              { label: 'Đã bán',             bg: '#ecfdf5', text: '#065f46' },
  recalled:          { label: 'Thu hồi',            bg: '#fff1f0', text: '#93000a' },
  cancelled:         { label: 'Đã hủy',            bg: '#f1f5f9', text: '#475569' },
};

// ─── Helpers ──────────────────────────────────────────────────
function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  try { return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d)); }
  catch { return d; }
}

function fmtDateTime(d?: string | null): string {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(d));
  } catch { return d; }
}

function fmtNum(n: number | string | null | undefined): string {
  if (n == null) return '—';
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(v)) return String(n);
  return v % 1 === 0 ? v.toLocaleString('vi-VN') : v.toFixed(2);
}

function isCertExpired(expires?: string | null) {
  if (!expires) return false;
  return new Date(expires) < new Date();
}

function docId(lotId: string) {
  return `TRACE-${lotId.toUpperCase()}`;
}

// ─── Font registration ────────────────────────────────────────
// TTF via data URI: fontkit handles TTF reliably vs woff2 subset failures.
let cachedFontFamily: string | null = null;
let cachedFontUri400: string | null = null;
let cachedFontUri700: string | null = null;
const TEXT_GLYPH_BUFFER = 2;
const RENDER_ONLY_TRAILING_SPACE = '\u00A0';

function appendRenderOnlySpace(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') {
    return children.endsWith(RENDER_ONLY_TRAILING_SPACE)
      ? children
      : `${children}${RENDER_ONLY_TRAILING_SPACE}`;
  }
  if (Array.isArray(children)) {
    return children.map(appendRenderOnlySpace);
  }
  return children;
}

function loadFontDataUri(filePath: string): string | null {
  try {
    const buf = fs.readFileSync(filePath);
    return `data:font/truetype;base64,${buf.toString('base64')}`;
  } catch { return null; }
}

function findFontFile(fileName: string): string | null {
  const candidates = [
    path.join(process.cwd(), 'public', 'fonts', fileName),
    path.join(process.cwd(), 'apps', 'web', 'public', 'fonts', fileName),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function registerFonts(Font: any): string {
  if (cachedFontFamily !== null) {
    if (cachedFontFamily === 'NotoSans' && cachedFontUri400 && cachedFontUri700) {
      try {
        Font.register({
          family: 'NotoSans',
          fonts: [
            { src: cachedFontUri400, fontWeight: 400 },
            { src: cachedFontUri700, fontWeight: 700 },
            { src: cachedFontUri400, fontWeight: 400, fontStyle: 'italic' },
            { src: cachedFontUri700, fontWeight: 700, fontStyle: 'italic' },
          ],
        });
        Font.registerHyphenationCallback((w: string) => [w]);
      } catch { /* already registered */ }
    }
    return cachedFontFamily;
  }
  try {
    const font400Path = findFontFile('NotoSans-400.ttf');
    const font700Path = findFontFile('NotoSans-700.ttf');
    const uri400 = font400Path ? loadFontDataUri(font400Path) : null;
    const uri700 = font700Path ? loadFontDataUri(font700Path) : null;
    if (uri400 && uri700) {
      Font.register({
        family: 'NotoSans',
        fonts: [
          { src: uri400, fontWeight: 400 },
          { src: uri700, fontWeight: 700 },
          { src: uri400, fontWeight: 400, fontStyle: 'italic' },
          { src: uri700, fontWeight: 700, fontStyle: 'italic' },
        ],
      });
      Font.registerHyphenationCallback((w: string) => [w]);
      cachedFontUri400 = uri400;
      cachedFontUri700 = uri700;
      cachedFontFamily = 'NotoSans';
      return 'NotoSans';
    }
  } catch { /* keep Helvetica */ }
  cachedFontFamily = 'Helvetica';
  return 'Helvetica';
}

// ─── GET handler ──────────────────────────────────────────────
export async function GET(_request: Request, { params }: { params: { lotId: string } }) {
  const { lotId } = params;
  try {
    return await buildPdf(lotId);
  } catch (err: any) {
    console.error('[PDF] Error:', err?.message ?? err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err), stack: err?.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function buildPdf(lotId: string) {
  // Use the shared helper so the PDF always shows exactly the same certificate
  // list as the public trace page (getPublicTraceData is the single source of truth).
  const traceData = await getPublicTraceData(lotId);
  if (!traceData) return new Response('Not found', { status: 404 });

  // Debug: log certificate details on every PDF request so mismatches are visible
  // in server logs. Remove or reduce once the bug is confirmed fixed.
  const rawCerts = (traceData.certificates ?? []) as any[];
  console.log(
    `[PDF] lotId=${lotId} cert_count=${rawCerts.length}`,
    rawCerts.map((c: any) => `${c.id}|${c.certificate_type}`),
  );

  // Deduplicate by id — should never be needed, but acts as a safety guard.
  const seenCertIds = new Set<string>();
  const certs = rawCerts.filter((c: any) => {
    if (!c.id || seenCertIds.has(c.id)) return false;
    seenCertIds.add(c.id);
    return true;
  });

  console.log(`[PDF] after dedup: ${certs.length} certs`);

  // Alias traceData as `batch` so the rest of the render code is unchanged.
  const batch: any = traceData;
  const bcRows: any[] = (traceData.batch_blockchain ?? []) as any[];

  const traceUrl = `${appUrl()}/trace/${lotId}`;
  const qrDataUrl = await QRCode.toDataURL(traceUrl, {
    width: 240, margin: 1,
    color: { dark: '#1a3c2e', light: '#ffffff' },
  });

  const renderer = _require('@react-pdf/renderer');
  const { Document, Page, Text, View, Image, StyleSheet, Font } = renderer;
  const renderFn = renderer.renderToBuffer;
  const SafePdfText = ({ children, ...props }: any) => (
    <Text {...props}>{appendRenderOnlySpace(children)}</Text>
  );

  const FF = registerFonts(Font);

  // ─── Data ─────────────────────────────────────────────────
  const product  = Array.isArray(batch.products)  ? batch.products[0]  : batch.products;
  const supplier = Array.isArray(batch.suppliers) ? batch.suppliers[0] : batch.suppliers;
  const rawEvents = (Array.isArray(batch.batch_events)  ? batch.batch_events  : []) as any[];

  const events = [...rawEvents].sort(
    (a, b) => new Date(a.occurred_at ?? 0).getTime() - new Date(b.occurred_at ?? 0).getTime()
  );

  const confirmedBc = bcRows.filter((r: any) => r.status === 'confirmed' && r.tx_hash);
  const pendingBc   = bcRows.filter((r: any) => r.status === 'pending');
  const integrityPct = events.length > 0
    ? Math.round((confirmedBc.length / events.length) * 100) : 0;
  const isVerified = confirmedBc.length > 0;
  const isRecalled = batch.status === 'recalled';

  const productName  = product?.name ?? 'Sản phẩm BlueFood';
  const supplierName = supplier?.name ?? '—';
  const statusCfg    = STATUS_CFG[batch.status] ?? { label: batch.status, bg: C.gray, text: C.med };
  const exportDate   = fmtDate(new Date().toISOString());
  const exportDateTime = fmtDateTime(new Date().toISOString());

  const infoItems = [
    { label: 'Ngày thu hoạch',  value: fmtDate(batch.harvest_date) },
    { label: 'Hạn sử dụng',     value: fmtDate(batch.expiration_date) },
    { label: 'Khối lượng',      value: `${fmtNum(batch.quantity)} ${batch.unit ?? ''}`.trim() },
    { label: 'Xuất xứ',         value: supplier?.address ?? batch.origin_location ?? '—' },
    { label: 'Nhà cung cấp',    value: supplierName },
    { label: 'Tỉnh / Vùng',     value: supplier?.province ?? '—' },
  ].filter((i) => i.value !== '—');

  // ─── Styles ───────────────────────────────────────────────
  const s = StyleSheet.create({
    page: {
      paddingTop: 36, paddingBottom: 56, paddingLeft: 36, paddingRight: 36,
      fontSize: 9, color: C.dark, fontFamily: FF, backgroundColor: C.white,
    },

    // Header
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    brandName: { fontSize: 20, fontWeight: 700, color: C.brand, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.2 },
    brandSub:  { fontSize: 7.5, color: C.green, marginTop: 2, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.2 },
    docTitle:  { fontSize: 13, fontWeight: 700, color: C.dark, marginTop: 8, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    docMeta:   { fontSize: 7.5, color: C.light, marginTop: 3, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    qrBlock:   { alignItems: 'flex-end', gap: 4 },
    qrImg:     { width: 90, height: 90 },
    lotCode:   { fontSize: 8, color: C.brand, fontWeight: 700, textAlign: 'right', paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 2 },
    statusText:  { fontSize: 7.5, fontWeight: 700, textAlign: 'center', paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },

    // Divider
    divider: { borderBottomWidth: 1, borderBottomColor: C.borderLight, marginVertical: 10 },
    thickDivider: { borderBottomWidth: 2, borderBottomColor: C.greenBorder, marginBottom: 12 },

    // Hero
    hero: {
      backgroundColor: C.greenLight,
      borderWidth: 1, borderColor: C.greenBorder,
      borderRadius: 8, padding: 12, marginBottom: 14,
    },
    heroTop:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    heroIcon:  { width: 36, height: 36, borderRadius: 6, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    heroIconTxt: { fontSize: 16, fontWeight: 700, color: C.white, lineHeight: 1.1 },
    heroProductName: { fontSize: 15, fontWeight: 700, color: C.brand, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    heroCategory: { fontSize: 8, color: C.green, marginTop: 1, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    heroFactRow: {
      flexDirection: 'row',
      borderTopWidth: 1, borderTopColor: C.greenBorder,
      paddingTop: 8, gap: 0,
    },
    heroFact: { flex: 1, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: C.greenBorder },
    heroFactLabel: { fontSize: 7, color: C.green, fontWeight: 700, marginBottom: 2, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    heroFactValue: { fontSize: 8.5, fontWeight: 700, color: C.brand, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },

    // Section
    sectionWrap: { marginBottom: 14 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    sectionBar: { width: 3, height: 14, backgroundColor: C.green, borderRadius: 2 },
    sectionTitle: { fontSize: 10.5, fontWeight: 700, color: C.brand, flex: 1, paddingRight: TEXT_GLYPH_BUFFER + 1, lineHeight: 1.25 },
    sectionCount: { fontSize: 8, color: C.light, marginLeft: 4, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },

    // Info grid
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    infoCell: {
      width: '50%', paddingVertical: 6, paddingHorizontal: 10,
      borderBottomWidth: 0.5, borderBottomColor: C.borderLight,
    },
    infoCellFull: {
      width: '100%', paddingVertical: 6, paddingHorizontal: 10,
      borderBottomWidth: 0.5, borderBottomColor: C.borderLight,
    },
    infoLabel: { fontSize: 7, color: C.light, fontWeight: 700, marginBottom: 2, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    infoValue: { fontSize: 9, color: C.dark, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },

    // Timeline
    timelineItem: { flexDirection: 'row', gap: 8, marginBottom: 2 },
    timelineLeft:  { width: 18, alignItems: 'center', paddingTop: 2 },
    timelineDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: C.green, flexShrink: 0 },
    timelineDotWarn: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.warnText, flexShrink: 0 },
    timelineDotDanger: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.dangerText, flexShrink: 0 },
    timelineLine:  { width: 1.5, flex: 1, backgroundColor: C.borderLight, marginTop: 3 },
    timelineContent: { flex: 1, paddingBottom: 8 },
    timelineLabel: { fontSize: 9, fontWeight: 700, color: C.dark, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    timelineDate:  { fontSize: 7.5, color: C.light, marginTop: 1, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    timelineLoc:   { fontSize: 8, color: C.med, marginTop: 1, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    timelineNote:  { fontSize: 7.5, color: C.med, marginTop: 2, fontStyle: 'italic', paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    timelineLastLabel: { fontSize: 9, fontWeight: 700, color: C.green, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },

    // Certificates
    certsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    certCard: {
      width: '48.5%',
      borderWidth: 1, borderColor: C.borderLight,
      borderRadius: 6,
      paddingHorizontal: 10, paddingVertical: 8,
      backgroundColor: C.white,
    },
    certCardExpired: {
      width: '48.5%',
      borderWidth: 1, borderColor: '#fca5a5',
      borderRadius: 6,
      paddingHorizontal: 10, paddingVertical: 8,
      backgroundColor: '#fff8f8',
    },
    certType: { fontSize: 9, fontWeight: 700, color: C.dark, marginBottom: 2, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    certIssuer: { fontSize: 7.5, color: C.med, paddingRight: TEXT_GLYPH_BUFFER + 1, lineHeight: 1.25 },
    certNum:   { fontSize: 7.5, color: C.light, fontFamily: FF, marginTop: 2, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    certDates: { fontSize: 7.5, color: C.med, marginTop: 3, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    certBadgeValid:   { backgroundColor: '#dcfce7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5, alignSelf: 'flex-start', marginTop: 4 },
    certBadgeExpired: { backgroundColor: '#fee2e2', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5, alignSelf: 'flex-start', marginTop: 4 },
    certBadgeTxt:  { fontSize: 7, fontWeight: 700, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    noCert: { fontSize: 8.5, color: C.light, fontStyle: 'italic', paddingVertical: 8, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },

    // Blockchain
    bcBox: { borderRadius: 6, padding: 10, borderWidth: 1 },
    bcRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    bcIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    bcIconTxt: { fontSize: 13, fontWeight: 700 },
    bcStatus: { fontSize: 9.5, fontWeight: 700, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    bcSub:    { fontSize: 8, color: C.med, marginTop: 1, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    bcProgress: { marginTop: 6 },
    bcProgressBar: { height: 4, borderRadius: 2, backgroundColor: C.borderLight },
    bcProgressFill: { height: 4, borderRadius: 2, backgroundColor: C.green },
    bcProgressLabel: { fontSize: 7.5, color: C.light, marginTop: 2, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    bcHashRow: {
      flexDirection: 'row', alignItems: 'center',
      borderTopWidth: 0.5, borderTopColor: C.borderLight,
      paddingTop: 6, marginTop: 6, gap: 6,
    },
    bcHash:   { fontSize: 7.5, fontFamily: FF, color: C.med, flex: 1, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    bcBlock:  { fontSize: 7.5, color: C.light, flexShrink: 0, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },

    // Footer
    footer: {
      position: 'absolute', bottom: 20, left: 36, right: 36,
      borderTopWidth: 1, borderTopColor: C.borderLight,
      paddingTop: 6,
    },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    footerBrand: { fontSize: 7.5, fontWeight: 700, color: C.brand, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    footerUrl:   { fontSize: 7, color: C.light, fontFamily: FF, marginTop: 1, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    footerRight: { alignItems: 'flex-end' },
    footerPage:  { fontSize: 7.5, color: C.light, paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25 },
    footerDisclaimer: {
      fontSize: 6.5, color: C.light, marginTop: 4,
      borderTopWidth: 0.5, borderTopColor: C.borderLight, paddingTop: 3,
      paddingRight: TEXT_GLYPH_BUFFER, lineHeight: 1.25,
    },
  });

  // ─── PDF document ─────────────────────────────────────────
  const doc = (
    <Document title={`Phiếu Truy Xuất Nguồn Gốc — ${lotId}`} author="BlueFood Traceability">
      <Page size="A4" style={s.page}>

        {/* ══ HEADER ══════════════════════════════════════════ */}
        <View style={s.headerRow}>
          {/* Left: brand + doc title */}
          <View style={{ flex: 1, paddingRight: 16 }}>
            <SafePdfText style={s.brandName}>BlueFood</SafePdfText>
            <SafePdfText style={s.brandSub}>FOOD SUPPLY CHAIN TRACEABILITY</SafePdfText>
            <View style={{ marginTop: 8, borderLeftWidth: 3, borderLeftColor: C.green, paddingLeft: 8 }}>
              <SafePdfText style={s.docTitle}>PHIẾU TRUY XUẤT NGUỒN GỐC</SafePdfText>
              <SafePdfText style={{ fontSize: 7.5, color: C.light, marginTop: 3 }}>
                Mã tài liệu: {docId(lotId)}   ·   Ngày xuất: {exportDateTime}
              </SafePdfText>
              <SafePdfText style={{ fontSize: 7, color: C.light, marginTop: 2, fontFamily: FF }}>
                {traceUrl}
              </SafePdfText>
            </View>
          </View>
          {/* Right: QR + lot + status */}
          <View style={s.qrBlock}>
            <Image src={qrDataUrl} style={s.qrImg} />
            <SafePdfText style={s.lotCode}>#{lotId}</SafePdfText>
            <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <SafePdfText style={[s.statusText, { color: statusCfg.text }]}>{statusCfg.label.toUpperCase()}</SafePdfText>
            </View>
          </View>
        </View>

        <View style={s.thickDivider} />

        {/* ══ HERO ════════════════════════════════════════════ */}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <SafePdfText style={s.heroIconTxt}>{productName.charAt(0).toUpperCase()}</SafePdfText>
            </View>
            <View style={{ flex: 1 }}>
              <SafePdfText style={s.heroProductName}>{productName}</SafePdfText>
              {product?.category && (
                <SafePdfText style={s.heroCategory}>{product.category}</SafePdfText>
              )}
            </View>
          </View>
          <View style={s.heroFactRow}>
            <View style={[s.heroFact, { borderLeftWidth: 0 }]}>
              <SafePdfText style={s.heroFactLabel}>MÃ LÔ HÀNG</SafePdfText>
              <SafePdfText style={[s.heroFactValue, { fontWeight: 700, fontSize: 8 }]}>{lotId}</SafePdfText>
            </View>
            <View style={s.heroFact}>
              <SafePdfText style={s.heroFactLabel}>NHÀ CUNG CẤP</SafePdfText>
              <SafePdfText style={s.heroFactValue}>{supplierName}</SafePdfText>
            </View>
            <View style={s.heroFact}>
              <SafePdfText style={s.heroFactLabel}>XUẤT XỨ</SafePdfText>
              <SafePdfText style={s.heroFactValue}>{supplier?.province ?? batch.origin_location ?? '—'}</SafePdfText>
            </View>
            <View style={[s.heroFact, { borderRightWidth: 0 }]}>
              <SafePdfText style={s.heroFactLabel}>TRẠNG THÁI</SafePdfText>
              <SafePdfText style={[s.heroFactValue, { color: statusCfg.text }]}>{statusCfg.label}</SafePdfText>
            </View>
          </View>
        </View>

        {/* ══ THÔNG TIN SẢN PHẨM ══════════════════════════════ */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <View style={s.sectionBar} />
            <SafePdfText style={s.sectionTitle}>Thông tin sản phẩm</SafePdfText>
          </View>
          <View style={{ borderWidth: 1, borderColor: C.borderLight, borderRadius: 6, overflow: 'hidden' }}>
            <View style={s.infoGrid}>
              {infoItems.map((item, i) => (
                <View key={item.label} style={[s.infoCell, i % 2 !== 0 ? { borderLeftWidth: 0.5, borderLeftColor: C.borderLight } : {}]}>
                  <SafePdfText style={s.infoLabel}>{item.label.toUpperCase()}</SafePdfText>
                  <SafePdfText style={s.infoValue}>{item.value}</SafePdfText>
                </View>
              ))}
              {batch.notes && (
                <View style={s.infoCellFull}>
                  <SafePdfText style={s.infoLabel}>GHI CHÚ / ĐIỀU KIỆN BẢO QUẢN</SafePdfText>
                  <SafePdfText style={s.infoValue}>{batch.notes}</SafePdfText>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ══ LỊCH TRÌNH TRUY XUẤT ════════════════════════════ */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <View style={s.sectionBar} />
            <SafePdfText style={s.sectionTitle}>Lịch trình chuỗi cung ứng</SafePdfText>
            <SafePdfText style={s.sectionCount}>({events.length} sự kiện)</SafePdfText>
          </View>

          {events.length === 0 ? (
            <SafePdfText style={s.noCert}>Chưa có sự kiện nào được ghi nhận.</SafePdfText>
          ) : (
            <View style={{ borderWidth: 1, borderColor: C.borderLight, borderRadius: 6, padding: 10 }}>
              {events.map((ev: any, i: number) => {
                const isLast = i === events.length - 1;
                const isAlert = ev.event_type === 'recalled' || ev.event_type === 'issue_reported';
                const isWarn  = ev.event_type === 'in_transit' || ev.event_type === 'pickup';
                const dotStyle = isAlert ? s.timelineDotDanger : isWarn ? s.timelineDotWarn : s.timelineDot;
                const labelStyle = isLast ? s.timelineLastLabel : s.timelineLabel;
                return (
                  <View key={`${ev.event_type}-${i}`} style={s.timelineItem}>
                    <View style={s.timelineLeft}>
                      <View style={dotStyle} />
                      {!isLast && <View style={s.timelineLine} />}
                    </View>
                    <View style={s.timelineContent}>
                      <SafePdfText style={labelStyle}>
                        {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                      </SafePdfText>
                      <SafePdfText style={s.timelineDate}>{fmtDateTime(ev.occurred_at)}</SafePdfText>
                      {ev.location_name && (
                        <SafePdfText style={s.timelineLoc}>{ev.location_name}</SafePdfText>
                      )}
                      {ev.note && (
                        <SafePdfText style={s.timelineNote}>{ev.note}</SafePdfText>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ══ CHỨNG NHẬN ══════════════════════════════════════ */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <View style={s.sectionBar} />
            <SafePdfText style={s.sectionTitle}>Chứng nhận chất lượng</SafePdfText>
            <SafePdfText style={s.sectionCount}>({certs.length})</SafePdfText>
          </View>

          {certs.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: C.borderLight, borderRadius: 6, padding: 10 }}>
              <SafePdfText style={s.noCert}>Chưa có chứng nhận công khai cho lô hàng này.</SafePdfText>
            </View>
          ) : (
            <View style={s.certsGrid}>
              {certs.map((cert: any, i: number) => {
                const expired = isCertExpired(cert.expires_at);
                return (
                  <View key={i} style={expired ? s.certCardExpired : s.certCard}>
                    <SafePdfText style={s.certType}>{cert.certificate_type}</SafePdfText>
                    {cert.issuer && <SafePdfText style={s.certIssuer}>{cert.issuer}</SafePdfText>}
                    {cert.certificate_number && (
                      <SafePdfText style={s.certNum}>#{cert.certificate_number}</SafePdfText>
                    )}
                    <SafePdfText style={s.certDates}>
                      {fmtDate(cert.issued_at)} → {cert.expires_at ? fmtDate(cert.expires_at) : 'Không thời hạn'}
                    </SafePdfText>
                    <View style={expired ? s.certBadgeExpired : s.certBadgeValid}>
                      <SafePdfText style={[s.certBadgeTxt, { color: expired ? '#93000a' : '#166534' }]}>
                        {expired ? 'Hết hiệu lực' : 'Còn hiệu lực'}
                      </SafePdfText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ══ XÁC MINH BLOCKCHAIN ══════════════════════════════ */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <View style={s.sectionBar} />
            <SafePdfText style={s.sectionTitle}>Xác minh dữ liệu Blockchain</SafePdfText>
          </View>

          <View style={[
            s.bcBox,
            isRecalled
              ? { backgroundColor: C.danger,    borderColor: '#fca5a5' }
              : isVerified
              ? { backgroundColor: C.greenLight, borderColor: C.greenBorder }
              : { backgroundColor: C.gray,       borderColor: C.borderLight },
          ]}>
            <View style={s.bcRow}>
              <View style={[
                s.bcIcon,
                { backgroundColor: isVerified ? C.green : C.light },
              ]}>
                <SafePdfText style={[s.bcIconTxt, { color: C.white }]}>
                  {isVerified ? '✓' : '?'}
                </SafePdfText>
              </View>
              <View style={{ flex: 1 }}>
                <SafePdfText style={[s.bcStatus, {
                  color: isRecalled ? C.dangerText : isVerified ? C.green : C.grayText,
                }]}>
                  {isRecalled ? 'Lô hàng đã bị thu hồi' : isVerified ? 'Đã xác minh Blockchain' : 'Chưa được xác minh'}
                </SafePdfText>
                <SafePdfText style={s.bcSub}>
                  {isVerified
                    ? `${confirmedBc.length}/${events.length} sự kiện đã ghi nhận · Toàn vẹn ${integrityPct}%`
                    : pendingBc.length > 0
                    ? `${pendingBc.length} sự kiện đang chờ xác nhận`
                    : 'Dữ liệu chưa được ghi lên blockchain.'}
                </SafePdfText>
              </View>
            </View>

            {isVerified && (
              <View style={s.bcProgress}>
                <View style={s.bcProgressBar}>
                  <View style={[s.bcProgressFill, { width: `${integrityPct}%` }]} />
                </View>
                <SafePdfText style={s.bcProgressLabel}>{integrityPct}% tính toàn vẹn dữ liệu</SafePdfText>
              </View>
            )}

            {confirmedBc.slice(0, 3).map((r: any, i: number) => (
              <View key={i} style={s.bcHashRow}>
                <SafePdfText style={{ fontSize: 7.5, color: C.green, flexShrink: 0 }}>TX:</SafePdfText>
                <SafePdfText style={s.bcHash} numberOfLines={1}>
                  {r.tx_hash ? `${r.tx_hash.slice(0, 20)}...${r.tx_hash.slice(-10)}` : '—'}
                </SafePdfText>
                {r.block_number && (
                  <SafePdfText style={s.bcBlock}>Block #{r.block_number}</SafePdfText>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ══ FOOTER (fixed) ══════════════════════════════════ */}
        <View style={s.footer} fixed>
          <View style={s.footerRow}>
            <View>
              <SafePdfText style={s.footerBrand}>BlueFood Traceability</SafePdfText>
              <SafePdfText style={s.footerUrl}>{traceUrl}</SafePdfText>
            </View>
            <View style={s.footerRight}>
              <SafePdfText style={s.footerPage} render={({ pageNumber, totalPages }: any) =>
                `Trang ${pageNumber} / ${totalPages}`
              } />
            </View>
          </View>
          <SafePdfText style={s.footerDisclaimer}>
            Tài liệu được tạo tự động từ hệ thống truy xuất nguồn gốc BlueFood. Thông tin phản ánh dữ liệu ghi nhận tại thời điểm xuất tài liệu ({exportDate}).
          </SafePdfText>
        </View>

      </Page>
    </Document>
  ) as React.ReactElement;



  const buffer = renderFn
    ? await renderFn(doc)
    : await (renderer as any).pdf(doc).toBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=trace-${lotId}.pdf`,
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  });
}
