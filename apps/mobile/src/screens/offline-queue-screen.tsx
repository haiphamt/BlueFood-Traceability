import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllQueueItems, syncPendingMutations } from '../lib/offline-queue';
import type { QueueItem } from '../lib/offline-queue';
import { EVENT_TYPE_LABELS } from '@bluefood/shared';

export function OfflineQueueScreen() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllQueueItems();
      setItems(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncPendingMutations();
      setSyncResult(`Đồng bộ: ${result.synced} thành công, ${result.failed} thất bại`);
      await loadItems();
    } catch (e: any) {
      setSyncResult(`Lỗi: ${e?.message}`);
    } finally {
      setSyncing(false);
    }
  }

  const pendingCount = items.filter((i) => i.status === 'pending').length;

  function renderItem({ item }: { item: QueueItem }) {
    const statusColor = item.status === 'synced' ? '#236c45' : item.status === 'failed' ? '#9f3434' : '#9a6418';
    const statusBg = item.status === 'synced' ? '#dfeee5' : item.status === 'failed' ? '#fde8e8' : '#fff0d6';
    const eventLabel = EVENT_TYPE_LABELS[item.eventType as keyof typeof EVENT_TYPE_LABELS] ?? item.eventType;

    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemBatchCode}>{item.batchCode}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.itemEvent}>{eventLabel}</Text>
        <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
        {item.errorMessage && <Text style={styles.errorText}>{item.errorMessage}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header stats */}
      <View style={styles.statsBar}>
        <View>
          <Text style={styles.statsCount}>{pendingCount}</Text>
          <Text style={styles.statsLabel}>chờ đồng bộ</Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.syncBtnText}>Đồng bộ ngay</Text>
          )}
        </TouchableOpacity>
      </View>

      {syncResult && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultText}>{syncResult}</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadItems} tintColor="#236c45" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Không có mục nào trong hàng chờ</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f4' },
  statsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#15231b',
  },
  statsCount: { color: '#fff', fontSize: 28, fontWeight: '800' },
  statsLabel: { color: '#8aaa96', fontSize: 12 },
  syncBtn: { backgroundColor: '#236c45', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  syncBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resultBanner: { backgroundColor: '#dfeee5', padding: 12 },
  resultText: { color: '#236c45', fontWeight: '600', fontSize: 13 },
  item: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#dfe5dc', gap: 4,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemBatchCode: { fontFamily: 'monospace', fontWeight: '800', color: '#236c45', fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  itemEvent: { color: '#17211b', fontSize: 14, fontWeight: '600' },
  itemDate: { color: '#66736b', fontSize: 12 },
  errorText: { color: '#9f3434', fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#66736b', fontSize: 14 },
});
