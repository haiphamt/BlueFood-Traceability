import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { getBatchSummary, type BatchCertificate, type BatchSummaryData, type BatchTimelineEvent } from '../lib/api';
import { getCachedBatchSummary, saveCachedBatchSummary } from '../lib/batch-cache';
import { useAuth } from '../lib/auth-context';
import { isNetworkRequestError, isOnline } from '../lib/network';
import { BATCH_STATUS_LABELS, EVENT_TYPE_LABELS } from '@bluefood/shared';
import type { BatchEventType, BatchStatus } from '@bluefood/shared';
import type { RootStackParamList } from '../navigation/root-navigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Route = RouteProp<RootStackParamList, 'BatchSummary'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'BatchSummary'>;

const EVENT_LABEL_OVERRIDES: Record<string, string> = {
  pickup: 'Xuất kho / Lấy hàng',
};

const NO_OFFLINE_CACHE_MESSAGE = 'Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u offline cho l\u00f4 n\u00e0y. K\u1ebft n\u1ed1i m\u1ea1ng r\u1ed3i th\u1eed l\u1ea1i.';

const STATUS_ORDER: Record<BatchStatus, number> = {
  draft: 0,
  created: 1,
  harvested: 2,
  packed: 3,
  quality_checked: 4,
  in_transit: 5,
  received_at_store: 6,
  sold: 7,
  recalled: 8,
  cancelled: 9,
};

const EVENT_STATUS_UPDATES: Partial<Record<BatchEventType, BatchStatus>> = {
  created: 'created',
  harvested: 'harvested',
  packed: 'packed',
  quality_checked: 'quality_checked',
  pickup: 'in_transit',
  in_transit: 'in_transit',
  delivered: 'received_at_store',
  received_at_store: 'received_at_store',
  sold: 'sold',
  recalled: 'recalled',
};

function eventTime(event: BatchTimelineEvent) {
  const timestamp = event.occurredAt ? new Date(event.occurredAt).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatEventLabel(eventType?: string | null) {
  if (!eventType) return 'Cập nhật';
  return (
    EVENT_LABEL_OVERRIDES[eventType] ??
    EVENT_TYPE_LABELS[eventType as keyof typeof EVENT_TYPE_LABELS] ??
    eventType
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
}

function formatEventTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatEventMeta(event: BatchTimelineEvent) {
  return [formatEventTime(event.occurredAt), event.locationName, event.transporterName]
    .filter(Boolean)
    .join(' - ');
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatQuantity(quantity?: number | string | null, unit?: string | null) {
  if (quantity === null || quantity === undefined || quantity === '') return null;
  return [String(quantity), unit].filter(Boolean).join(' ');
}

function deriveBatchStatus(status: string | null | undefined, timeline: BatchTimelineEvent[]) {
  if (status === 'cancelled' || status === 'recalled') return status;

  const currentOrder = STATUS_ORDER[status as BatchStatus] ?? -1;
  let derivedStatus = status ?? '';
  let derivedOrder = currentOrder;

  for (const event of timeline) {
    const eventStatus = EVENT_STATUS_UPDATES[event.eventType as BatchEventType];
    if (!eventStatus || eventStatus === 'recalled') continue;

    const eventOrder = STATUS_ORDER[eventStatus];
    if (eventOrder >= derivedOrder) {
      derivedStatus = eventStatus;
      derivedOrder = eventOrder;
    }
  }

  return derivedStatus;
}

function certificateTitle(cert: BatchCertificate) {
  return cert.certificateType ?? cert.type ?? 'Chứng nhận';
}

function certificateStatus(cert: BatchCertificate) {
  if (!cert.expiresAt) return { label: 'Còn hiệu lực', tone: 'valid' as const };

  const expiry = new Date(cert.expiresAt);
  if (Number.isNaN(expiry.getTime())) return { label: 'Còn hiệu lực', tone: 'valid' as const };

  const diff = expiry.getTime() - Date.now();
  if (diff < 0) return { label: 'Hết hạn', tone: 'expired' as const };
  if (diff <= 30 * 24 * 60 * 60 * 1000) return { label: 'Sắp hết hạn', tone: 'expiring' as const };
  return { label: 'Còn hiệu lực', tone: 'valid' as const };
}

export function BatchSummaryScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { isLoggedIn } = useAuth();
  const { batchCode } = route.params;

  const [data, setData] = useState<BatchSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;

    async function loadBatch() {
      setLoading(true);
      setError('');
      setData(null);
      setFromCache(false);

      try {
        const apiReachable = await isOnline();
        if (!active) return;
        setOnline(apiReachable);

        if (!apiReachable) {
          const cached = await getCachedBatchSummary(batchCode);
          if (!active) return;

          if (cached) {
            setData(cached.data);
            setFromCache(true);
          } else {
            setError(NO_OFFLINE_CACHE_MESSAGE);
          }
          return;
        }

        const remoteData = await getBatchSummary(batchCode);
        try {
          await saveCachedBatchSummary(remoteData);
        } catch {
          // Cache writes should not block viewing fresh server data.
        }

        if (!active) return;
        setData(remoteData);
        setFromCache(false);
        setOnline(true);
      } catch (e: any) {
        if (isNetworkRequestError(e)) {
          const cached = await getCachedBatchSummary(batchCode);
          if (!active) return;

          setOnline(false);
          if (cached) {
            setData(cached.data);
            setFromCache(true);
          } else {
            setError(NO_OFFLINE_CACHE_MESSAGE);
          }
          return;
        }

        if (!active) return;
        setError(e.message ?? 'Không tải được dữ liệu');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBatch();

    return () => {
      active = false;
    };
  }, [batchCode]));

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color="#236c45" size="large" /></View>;
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.muted}>{batchCode}</Text>
      </View>
    );
  }

  const timeline: BatchTimelineEvent[] = Array.isArray(data?.timeline)
    ? [...data.timeline].sort((a, b) => eventTime(a) - eventTime(b))
    : [];
  const batchStatus = deriveBatchStatus(data?.status, timeline);
  const statusLabel = batchStatus
    ? BATCH_STATUS_LABELS[batchStatus as keyof typeof BATCH_STATUS_LABELS] ?? batchStatus
    : '—';
  const certificates: BatchCertificate[] = Array.isArray(data?.certificates) ? data.certificates : [];
  const latestEvent = timeline[timeline.length - 1];
  const latestEventType = latestEvent?.eventType;
  const hasReceived = batchStatus === 'received_at_store' || batchStatus === 'sold' || timeline.some((e) => e.eventType === 'received_at_store');
  const hasSold = batchStatus === 'sold' || timeline.some((e) => e.eventType === 'sold');
  const canReceive = !hasReceived && !hasSold && (batchStatus === 'in_transit' || latestEventType === 'in_transit' || latestEventType === 'delivered');
  const canReportIssue = !['sold', 'recalled', 'cancelled'].includes(batchStatus);
  const canMarkSold = hasReceived && !hasSold && !['recalled', 'cancelled'].includes(batchStatus);
  const actions = [
    {
      label: '✓ Xác nhận đã nhận',
      eventType: 'received_at_store',
      mode: 'receive' as const,
      title: 'Xác nhận đã nhận',
      enabled: canReceive,
      disabledReason: hasReceived ? 'Lô này đã được nhận tại cửa hàng.' : 'Chỉ khả dụng khi lô đang vận chuyển.',
    },
    {
      label: '⚠ Báo lỗi',
      eventType: 'issue_reported',
      mode: 'issue' as const,
      title: 'Báo cáo sự cố',
      enabled: canReportIssue,
      disabledReason: 'Không thể báo cáo sự cố cho lô đã kết thúc.',
    },
    {
      label: '🛒 Đánh dấu đã bán',
      eventType: 'sold',
      mode: 'sold' as const,
      title: 'Đánh dấu đã bán',
      enabled: canMarkSold,
      disabledReason: hasSold ? 'Lô này đã được đánh dấu đã bán.' : 'Chỉ khả dụng sau khi lô đã nhận tại cửa hàng.',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}>
      {/* Status */}
      <View style={styles.card}>
        <Text style={styles.batchCode}>{batchCode}</Text>
        <Text style={styles.productName}>{data?.productName}</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
          {fromCache ? (
            <Text style={styles.cachedBadge}>Offline cache</Text>
          ) : (
            !online && <Text style={styles.offlineBadge}>⚠ Offline</Text>
          )}
        </View>
        <Text style={styles.supplierText}>NCC: {data?.supplierName}</Text>
        {latestEvent && (
          <Text style={styles.lastEvent}>
            Sự kiện gần nhất: {formatEventLabel(latestEvent.eventType)}
          </Text>
        )}
      </View>

      {/* Quick facts */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Thông tin nhanh</Text>
        {[
          ['Xuất xứ', data?.originLocation],
          ['Khối lượng', formatQuantity(data?.quantity, data?.unit)],
          ['Thu hoạch', formatDate(data?.harvestDate)],
          ['Hết hạn', formatDate(data?.expirationDate)],
        ].map(([label, value]) => (
          <View key={label} style={styles.factRow}>
            <Text style={styles.factLabel}>{label}</Text>
            <Text style={styles.factValue}>{value ?? '—'}</Text>
          </View>
        ))}
      </View>

      {/* Certificates */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Chứng nhận chất lượng ({certificates.length})</Text>
        {certificates.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có chứng nhận</Text>
        ) : (
          certificates.map((cert, idx) => {
            const status = certificateStatus(cert);
            const badgeStyle =
              status.tone === 'expired'
                ? styles.certBadge_expired
                : status.tone === 'expiring'
                  ? styles.certBadge_expiring
                  : styles.certBadge_valid;
            const badgeTextStyle =
              status.tone === 'expired'
                ? styles.certBadgeText_expired
                : status.tone === 'expiring'
                  ? styles.certBadgeText_expiring
                  : styles.certBadgeText_valid;
            return (
              <View key={`${certificateTitle(cert)}-${cert.certificateNumber ?? idx}`} style={styles.certCard}>
                <View style={styles.certHeader}>
                  <Text style={styles.certTitle} numberOfLines={1}>{certificateTitle(cert)}</Text>
                  <View style={[styles.certBadge, badgeStyle]}>
                    <Text style={[styles.certBadgeText, badgeTextStyle]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.certIssuer} numberOfLines={1}>
                  {cert.issuer ?? 'Đơn vị cấp chưa rõ'}
                </Text>
                <View style={styles.certMetaGrid}>
                  <View style={styles.certMetaItem}>
                    <Text style={styles.certMetaLabel}>Số</Text>
                    <Text style={styles.certMetaValue} numberOfLines={1}>{cert.certificateNumber ?? '—'}</Text>
                  </View>
                  <View style={styles.certMetaItem}>
                    <Text style={styles.certMetaLabel}>Ngày cấp</Text>
                    <Text style={styles.certMetaValue} numberOfLines={1}>{formatDate(cert.issuedAt) ?? '—'}</Text>
                  </View>
                  <View style={styles.certMetaItem}>
                    <Text style={styles.certMetaLabel}>Hết hạn</Text>
                    <Text style={styles.certMetaValue} numberOfLines={1}>{formatDate(cert.expiresAt) ?? '—'}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Actions */}
      {isLoggedIn ? (
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Hành động nhân viên</Text>
          {actions.map((action) => (
            <View key={action.eventType} style={styles.actionItem}>
              <TouchableOpacity
                style={[styles.actionBtn, !action.enabled && styles.actionBtnDisabled]}
                disabled={!action.enabled}
                onPress={() => navigation.navigate('ConfirmEvent', {
                  batchCode,
                  initialEventType: action.eventType,
                  mode: action.mode,
                  title: action.title,
                })}
              >
                <Text style={[styles.actionBtnText, !action.enabled && styles.actionBtnTextDisabled]}>{action.label}</Text>
              </TouchableOpacity>
              {!action.enabled && <Text style={styles.actionHint}>{action.disabledReason}</Text>}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.publicNoticeCard}>
          <Text style={styles.sectionTitle}>Chế độ truy xuất công khai</Text>
          <Text style={styles.publicNoticeText}>
            Bạn chỉ đang xem thông tin nguồn gốc lô hàng. Đăng nhập bằng tài khoản nhân viên cửa hàng để ghi nhận nhận hàng, báo lỗi hoặc đánh dấu đã bán.
          </Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginBtnText}>Đăng nhập nhân viên</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timeline preview */}
      {timeline.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lịch sử ({timeline.length} sự kiện)</Text>
          {timeline.map((e, idx) => {
            const meta = formatEventMeta(e);
            return (
              <View key={e.id ?? `${e.eventType ?? 'event'}-${e.occurredAt ?? idx}`} style={styles.timelineItem}>
                <Text style={styles.timelineType} numberOfLines={1}>
                  {formatEventLabel(e.eventType)}
                </Text>
                {meta ? <Text style={styles.timelineMeta} numberOfLines={1}>{meta}</Text> : null}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f4' },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#dfe5dc', gap: 6 },
  actionsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#dfe5dc', gap: 8 },
  publicNoticeCard: { backgroundColor: '#e1f3e6', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#b9dec5', gap: 10 },
  publicNoticeText: { color: '#345346', fontSize: 13, lineHeight: 19 },
  loginBtn: { backgroundColor: '#236c45', borderRadius: 10, padding: 13, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  batchCode: { fontFamily: 'monospace', fontWeight: '800', fontSize: 18, color: '#236c45' },
  productName: { fontSize: 16, fontWeight: '700', color: '#17211b' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { backgroundColor: '#fff0d6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: '#9a6418', fontSize: 12, fontWeight: '700' },
  offlineBadge: { color: '#9f3434', fontSize: 12, fontWeight: '700' },
  cachedBadge: { color: '#9a6418', fontSize: 12, fontWeight: '700' },
  supplierText: { color: '#66736b', fontSize: 13 },
  lastEvent: { color: '#66736b', fontSize: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#17211b', marginBottom: 4 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  factLabel: { color: '#66736b', fontSize: 13 },
  factValue: { color: '#17211b', fontSize: 13, fontWeight: '600' },
  emptyText: { color: '#66736b', fontSize: 13, paddingVertical: 4 },
  certCard: { backgroundColor: '#f6f7f4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#dfe5dc', gap: 8 },
  certHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  certTitle: { flex: 1, color: '#17211b', fontSize: 14, fontWeight: '800' },
  certIssuer: { color: '#66736b', fontSize: 12 },
  certBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  certBadge_valid: { backgroundColor: '#e1f3e6', borderColor: '#b9dec5' },
  certBadge_expiring: { backgroundColor: '#fff0d6', borderColor: '#f1ce8a' },
  certBadge_expired: { backgroundColor: '#fde4e4', borderColor: '#efb0b0' },
  certBadgeText: { fontSize: 11, fontWeight: '700' },
  certBadgeText_valid: { color: '#236c45' },
  certBadgeText_expiring: { color: '#9a6418' },
  certBadgeText_expired: { color: '#9f3434' },
  certMetaGrid: { gap: 4 },
  certMetaItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  certMetaLabel: { color: '#66736b', fontSize: 12 },
  certMetaValue: { flex: 1, textAlign: 'right', color: '#17211b', fontSize: 12, fontWeight: '600' },
  actionBtn: { backgroundColor: '#f6f7f4', borderRadius: 10, padding: 13, borderWidth: 1, borderColor: '#dfe5dc' },
  actionItem: { gap: 4 },
  actionBtnDisabled: { opacity: 0.55 },
  actionBtnText: { color: '#17211b', fontSize: 14, fontWeight: '600' },
  actionBtnTextDisabled: { color: '#66736b' },
  actionHint: { color: '#66736b', fontSize: 12, paddingHorizontal: 4 },
  timelineItem: { borderLeftWidth: 2, borderLeftColor: '#236c45', paddingLeft: 10, paddingVertical: 4 },
  timelineType: { fontSize: 13, fontWeight: '600', color: '#17211b' },
  timelineMeta: { fontSize: 12, color: '#66736b' },
  errorText: { color: '#9f3434', fontSize: 16, fontWeight: '600' },
  muted: { color: '#66736b', fontSize: 13 },
});
