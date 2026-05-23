import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getPendingMutations, syncPendingMutations } from '../lib/offline-queue';
import { isOnline, subscribeToNetworkChanges } from '../lib/network';

export function SyncBanner() {
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsub = subscribeToNetworkChanges(async (isOnlineNow) => {
      setOnline(isOnlineNow);
      if (isOnlineNow) {
        const pending = await getPendingMutations();
        if (pending.length > 0) handleAutoSync();
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    isOnline().then(setOnline);
    getPendingMutations().then((items) => setPendingCount(items.length));
  }, []);

  async function handleAutoSync() {
    setSyncing(true);
    try {
      await syncPendingMutations();
      const remaining = await getPendingMutations();
      setPendingCount(remaining.length);
    } finally {
      setSyncing(false);
    }
  }

  if (!pendingCount && online) return null;

  return (
    <View style={[styles.banner, !online && styles.offlineBanner]}>
      <Text style={styles.text}>
        {!online ? '⚠ Offline' : `${pendingCount} chờ đồng bộ`}
      </Text>
      {online && pendingCount > 0 && (
        <TouchableOpacity onPress={handleAutoSync} disabled={syncing} style={styles.btn}>
          {syncing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Sync</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#9a6418', paddingHorizontal: 16, paddingVertical: 8,
  },
  offlineBanner: { backgroundColor: '#9f3434' },
  text: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btn: { backgroundColor: 'rgba(255,255,255,.2)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
