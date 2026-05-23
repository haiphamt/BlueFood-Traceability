import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BATCH_STATUS_LABELS } from '@bluefood/shared';
import type { BatchStatus } from '@bluefood/shared';

const STATUS_COLORS: Record<BatchStatus, { bg: string; text: string }> = {
  draft: { bg: '#e5e7eb', text: '#374151' },
  created: { bg: '#dbeafe', text: '#1d4ed8' },
  harvested: { bg: '#dcfce7', text: '#16a34a' },
  packed: { bg: '#ccfbf1', text: '#0f766e' },
  quality_checked: { bg: '#e0e7ff', text: '#4338ca' },
  in_transit: { bg: '#fff0d6', text: '#9a6418' },
  received_at_store: { bg: '#f3e8ff', text: '#7e22ce' },
  sold: { bg: '#dcfce7', text: '#15803d' },
  recalled: { bg: '#fde8e8', text: '#9f3434' },
  cancelled: { bg: '#e5e7eb', text: '#6b7280' },
};

interface StatusPillProps {
  status: BatchStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  const colors = STATUS_COLORS[status] ?? { bg: '#e5e7eb', text: '#374151' };

  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {BATCH_STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700' },
});
