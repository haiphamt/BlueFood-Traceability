import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth-context';
import { buildApiUrl } from '../lib/config';
import { handleNetworkRequestFailed } from '../lib/network';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/root-navigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(buildApiUrl('/api/auth/mobile-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? 'Đăng nhập thất bại');
        return;
      }

      login(email, data.access_token);
    } catch (e) {
      handleNetworkRequestFailed(e);
      setError('Không thể kết nối tới server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>B</Text>
        </View>
        <Text style={styles.brandName}>BlueFood</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Đăng nhập</Text>
        <Text style={styles.subtitle}>Hệ thống truy xuất thực phẩm</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#66736b"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          placeholderTextColor="#66736b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.publicBtn}
          onPress={() => navigation.navigate('PublicScan')}
          disabled={loading}
        >
          <Text style={styles.publicBtnText}>Quét QR truy xuất công khai</Text>
        </TouchableOpacity>
        <Text style={styles.publicHint}>
          Không cần tài khoản nếu chỉ xem nguồn gốc lô hàng.
        </Text>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15231b', justifyContent: 'center', padding: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32, justifyContent: 'center' },
  brandMark: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#e1f3e6', alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: '#1c5b39', fontWeight: '800', fontSize: 20 },
  brandName: { color: '#fff', fontWeight: '800', fontSize: 22, letterSpacing: -0.5 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#17211b' },
  subtitle: { fontSize: 14, color: '#66736b', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#dfe5dc', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#17211b', backgroundColor: '#f6f7f4',
  },
  error: { color: '#9f3434', fontSize: 13, textAlign: 'center' },
  btn: { backgroundColor: '#236c45', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#dfe5dc', marginVertical: 4 },
  publicBtn: {
    borderWidth: 1, borderColor: '#b9dec5', borderRadius: 10,
    padding: 14, alignItems: 'center', backgroundColor: '#e1f3e6',
  },
  publicBtnText: { color: '#1c5b39', fontWeight: '800', fontSize: 14 },
  publicHint: { color: '#66736b', fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
