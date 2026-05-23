import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isOnline } from '../lib/network';
import { enqueueMutation, syncPendingMutations } from '../lib/offline-queue';
import { EVENT_TYPE_LABELS, type BatchEventType } from '@bluefood/shared';
import type { RootStackParamList } from '../navigation/root-navigator';
import { useAuth } from '../lib/auth-context';
import { hasAuthToken } from '../lib/api';

type Route = RouteProp<RootStackParamList, 'ConfirmEvent'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'ConfirmEvent'>;
type ConfirmMode = NonNullable<RootStackParamList['ConfirmEvent']['mode']>;
const NORMAL_EVENT_TYPES: BatchEventType[] = [
  'received_at_store',
  'sold',
  'harvested',
  'packed',
  'quality_checked',
];
const ISSUE_TYPES = ['Chất lượng', 'Bao bì', 'Nhiệt độ', 'Giao hàng', 'Khác'];
const SEVERITIES = ['Thấp', 'Trung bình', 'Cao'];

function inferMode(eventType?: string): ConfirmMode {
  if (eventType === 'received_at_store') return 'receive';
  if (eventType === 'issue_reported') return 'issue';
  if (eventType === 'sold') return 'sold';
  return 'generic';
}

function eventLabel(eventType: string) {
  return EVENT_TYPE_LABELS[eventType as BatchEventType] ?? eventType;
}

function getModeCopy(mode: ConfirmMode, eventType: string) {
  if (mode === 'receive') {
    return {
      title: 'Xác nhận đã nhận',
      subtitle: 'Xác nhận lô hàng đã được nhận tại cửa hàng.',
      eventLabel: 'Nhận tại cửa hàng',
      submitText: 'Xác nhận đã nhận',
      noteLabel: 'Ghi chú',
      notePlaceholder: 'Tình trạng khi nhận, ghi chú nhiệt độ hoặc bao bì...',
      showLocation: true,
      showTemperature: true,
      showNote: true,
    };
  }

  if (mode === 'issue') {
    return {
      title: 'Báo cáo sự cố',
      subtitle: 'Ghi nhận vấn đề phát sinh',
      eventLabel: 'Báo cáo sự cố',
      submitText: 'Gửi báo cáo',
      noteLabel: 'Mô tả sự cố',
      notePlaceholder: 'Mô tả vấn đề, mức độ ảnh hưởng, hành động đã xử lý...',
      showLocation: true,
      showTemperature: false,
      showNote: true,
    };
  }

  if (mode === 'sold') {
    return {
      title: 'Đánh dấu đã bán',
      subtitle: 'Ghi nhận lô hàng đã được bán tại cửa hàng.',
      eventLabel: 'Đã bán',
      submitText: 'Đánh dấu đã bán',
      noteLabel: 'Ghi chú',
      notePlaceholder: 'Ghi chú bán hàng nếu có...',
      showLocation: true,
      showTemperature: false,
      showNote: true,
    };
  }

  return {
    title: 'Xác nhận sự kiện',
    subtitle: 'Xác nhận sự kiện chuỗi cung ứng',
    eventLabel: eventLabel(eventType),
    submitText: 'Xác nhận & Lưu',
    noteLabel: 'Ghi chú',
    notePlaceholder: 'Ghi chú thêm...',
    showLocation: true,
    showTemperature: true,
    showNote: true,
  };
}

export function ConfirmEventScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { isLoggedIn } = useAuth();
  const { batchCode, initialEventType, eventType: legacyEventType, title } = route.params;
  const fixedEventType = initialEventType ?? legacyEventType;
  const mode = route.params.mode ?? inferMode(fixedEventType);
  const isFixedEventType = Boolean(fixedEventType);

  const [eventType, setEventType] = useState(fixedEventType ?? 'received_at_store');
  const [locationName, setLocationName] = useState('');
  const [note, setNote] = useState('');
  const [temperatureC, setTemperatureC] = useState('');
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [severity, setSeverity] = useState(SEVERITIES[1]);
  const [loading, setLoading] = useState(false);
  const copy = getModeCopy(mode, eventType);
  const screenTitle = title ?? copy.title;
  const subtitle = mode === 'issue' ? `${copy.subtitle} cho lô ${batchCode}.` : copy.subtitle;

  useEffect(() => {
    navigation.setOptions({ title: screenTitle });
  }, [navigation, screenTitle]);

  async function handleSubmit() {
    if (!isLoggedIn || !hasAuthToken()) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập trước khi xác nhận sự kiện.');
      return;
    }
    if (mode === 'issue' && !note.trim()) {
      Alert.alert('Thiếu mô tả', 'Vui lòng mô tả sự cố trước khi gửi báo cáo.');
      return;
    }

    setLoading(true);
    try {
      const online = await isOnline();
      const formattedNote = mode === 'issue'
        ? [`Loại sự cố: ${issueType}`, `Mức độ: ${severity}`, note.trim()].join('\n')
        : note || undefined;
      const payload = {
        batchCode,
        eventType,
        occurredAt: new Date().toISOString(),
        locationName: locationName || undefined,
        note: formattedNote,
        temperatureC: copy.showTemperature && temperatureC ? parseFloat(temperatureC) : undefined,
      };

      await enqueueMutation(payload);

      if (online) {
        const result = await syncPendingMutations();
        if (result.synced > 0) {
          Alert.alert('Thành công', `Đã đồng bộ ${result.synced} sự kiện`, [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert('Đã lưu offline', 'Sự kiện sẽ được đồng bộ khi có kết nối mạng.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } else {
        Alert.alert('Đã lưu offline', 'Sự kiện sẽ được đồng bộ khi có kết nối mạng.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể lưu sự kiện');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>{screenTitle}</Text>
        <Text style={styles.batchCode}>{batchCode}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Loại sự kiện</Text>
        {isFixedEventType ? (
          <View style={styles.lockedType}>
            <Text style={styles.lockedTypeText}>{copy.eventLabel}</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {NORMAL_EVENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, eventType === type && styles.typeChipActive]}
                onPress={() => setEventType(type)}
              >
                <Text style={[styles.typeChipText, eventType === type && styles.typeChipTextActive]}>
                  {eventLabel(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.card}>
        {mode === 'issue' && copy.showNote && (
          <>
            <Text style={styles.label}>Loại sự cố</Text>
            <View style={styles.optionGrid}>
              {ISSUE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionChip, issueType === type && styles.optionChipActive]}
                  onPress={() => setIssueType(type)}
                >
                  <Text style={[styles.optionChipText, issueType === type && styles.optionChipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 10 }]}>Mức độ</Text>
            <View style={styles.optionGrid}>
              {SEVERITIES.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.optionChip, severity === level && styles.optionChipActive]}
                  onPress={() => setSeverity(level)}
                >
                  <Text style={[styles.optionChipText, severity === level && styles.optionChipTextActive]}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{copy.noteLabel}</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder={copy.notePlaceholder}
              placeholderTextColor="#66736b"
              value={note}
              onChangeText={setNote}
              multiline
            />
          </>
        )}

        {copy.showLocation && (
          <>
            <Text style={[styles.label, mode === 'issue' && { marginTop: 8 }]}>Địa điểm</Text>
            <TextInput
              style={styles.input}
              placeholder="BlueFood Quận 7..."
              placeholderTextColor="#66736b"
              value={locationName}
              onChangeText={setLocationName}
            />
          </>
        )}

        {copy.showTemperature && (
          <>
            <Text style={[styles.label, { marginTop: 8 }]}>Nhiệt độ (°C)</Text>
            <TextInput
              style={styles.input}
              placeholder="6"
              placeholderTextColor="#66736b"
              value={temperatureC}
              onChangeText={setTemperatureC}
              keyboardType="decimal-pad"
            />
          </>
        )}

        {mode !== 'issue' && copy.showNote && (
          <>
            <Text style={[styles.label, { marginTop: 8 }]}>{copy.noteLabel}</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder={copy.notePlaceholder}
              placeholderTextColor="#66736b"
              value={note}
              onChangeText={setNote}
              multiline
            />
          </>
        )}
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>{copy.submitText}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelBtnText}>Hủy</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f4' },
  header: { paddingTop: 8, gap: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#17211b' },
  batchCode: { fontFamily: 'monospace', fontWeight: '800', fontSize: 18, color: '#236c45' },
  subtitle: { color: '#66736b', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#dfe5dc' },
  label: { fontSize: 13, fontWeight: '600', color: '#17211b', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#dfe5dc', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#17211b', backgroundColor: '#f6f7f4',
  },
  noteInput: { height: 96, textAlignVertical: 'top' },
  lockedType: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#236c45',
    borderRadius: 999,
    backgroundColor: '#dfeee5',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lockedTypeText: { color: '#236c45', fontSize: 13, fontWeight: '700' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  optionChip: {
    borderWidth: 1,
    borderColor: '#dfe5dc',
    borderRadius: 999,
    backgroundColor: '#f6f7f4',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionChipActive: { backgroundColor: '#236c45', borderColor: '#236c45' },
  optionChipText: { color: '#66736b', fontSize: 13, fontWeight: '600' },
  optionChipTextActive: { color: '#fff' },
  typeScroll: { marginHorizontal: -4 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: '#dfe5dc', backgroundColor: '#f6f7f4',
    marginHorizontal: 4,
  },
  typeChipActive: { backgroundColor: '#236c45', borderColor: '#236c45' },
  typeChipText: { fontSize: 13, color: '#66736b', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#236c45', borderRadius: 12, padding: 15, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { borderWidth: 1, borderColor: '#dfe5dc', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#66736b', fontSize: 14 },
});
