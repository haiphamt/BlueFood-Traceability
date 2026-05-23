import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../lib/auth-context';

export function AccountScreen() {
  const { userEmail, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userEmail?.[0]?.toUpperCase() ?? 'U'}</Text>
        </View>
        <Text style={styles.email}>{userEmail ?? 'user@bluefood.vn'}</Text>
        <Text style={styles.role}>Store Staff</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Thông tin ứng dụng</Text>
        {[
          ['Phiên bản', '1.0.0'],
          ['Dự án', 'ITPJ2604'],
          ['Backend', process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'],
        ].map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f4', padding: 16, gap: 14 },
  profileCard: {
    backgroundColor: '#15231b', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 8,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#e1f3e6', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#1c5b39', fontWeight: '800', fontSize: 24 },
  email: { color: '#fff', fontWeight: '600', fontSize: 15 },
  role: { color: '#8aaa96', fontSize: 13 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#dfe5dc', gap: 4,
  },
  sectionTitle: { fontWeight: '700', fontSize: 13, color: '#17211b', marginBottom: 8 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  rowLabel: { color: '#66736b', fontSize: 13 },
  rowValue: { color: '#17211b', fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  logoutBtn: {
    borderWidth: 1, borderColor: '#fde8e8', borderRadius: 12,
    padding: 14, alignItems: 'center', backgroundColor: '#fde8e8',
  },
  logoutText: { color: '#9f3434', fontWeight: '700', fontSize: 14 },
});
