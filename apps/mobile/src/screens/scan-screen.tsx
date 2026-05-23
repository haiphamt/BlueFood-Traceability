import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { parseBatchCodeFromQr } from '../lib/parse-qr';
import { checkApiReachability, subscribeToNetworkChanges } from '../lib/network';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/root-navigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ScanScreen() {
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [online, setOnline] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(true);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showCameraRestart, setShowCameraRestart] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const lastScannedRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const onlineRef = useRef<boolean | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPreviewTimer = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const restartCamera = useCallback(() => {
    clearPreviewTimer();
    clearRestartTimer();
    lastScannedRef.current = null;
    setScanning(true);
    setCameraReady(false);
    setShowCameraRestart(false);
    setCameraEnabled(false);
    restartTimerRef.current = setTimeout(() => {
      setCameraKey((key) => key + 1);
      setCameraEnabled(true);
      restartTimerRef.current = null;
    }, 180);
  }, [clearPreviewTimer, clearRestartTimer]);

  const refreshReachability = useCallback(() => {
    void checkApiReachability({ force: true }).then(setOnline);
  }, []);

  useEffect(() => {
    return subscribeToNetworkChanges((isOnlineNow) => {
      const changed = onlineRef.current !== null && onlineRef.current !== isOnlineNow;
      onlineRef.current = isOnlineNow;
      setOnline(isOnlineNow);
      if (changed && isFocused && appStateRef.current === 'active') {
        restartCamera();
      }
    });
  }, [isFocused, restartCamera]);

  useEffect(() => {
    return () => {
      clearPreviewTimer();
      clearRestartTimer();
    };
  }, [clearPreviewTimer, clearRestartTimer]);

  const qrScreenActive = isFocused && appState === 'active';

  useEffect(() => {
    if (qrScreenActive) {
      restartCamera();
      refreshReachability();
      const reachabilityTimer = setInterval(refreshReachability, 7000);
      return () => clearInterval(reachabilityTimer);
    }

    clearPreviewTimer();
    clearRestartTimer();
    setCameraEnabled(false);
    setCameraReady(false);
    setShowCameraRestart(false);
  }, [clearPreviewTimer, clearRestartTimer, qrScreenActive, refreshReachability, restartCamera]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const returningActive = appStateRef.current !== 'active' && nextState === 'active';
      appStateRef.current = nextState;
      setAppState(nextState);

      if (returningActive && isFocused) {
        restartCamera();
        refreshReachability();
      }
    });

    return () => subscription.remove();
  }, [isFocused, refreshReachability, restartCamera]);

  const shouldRenderCamera = Boolean(permission?.granted && qrScreenActive && cameraEnabled);

  useEffect(() => {
    clearPreviewTimer();

    if (!shouldRenderCamera) {
      return undefined;
    }

    setCameraReady(false);
    setShowCameraRestart(false);
    previewTimerRef.current = setTimeout(() => {
      setShowCameraRestart(true);
    }, 3500);

    return clearPreviewTimer;
  }, [cameraKey, clearPreviewTimer, shouldRenderCamera]);

  const handleCameraReady = useCallback(() => {
    clearPreviewTimer();
    setCameraReady(true);
    setShowCameraRestart(false);
  }, [clearPreviewTimer]);

  const handleCameraMountError = useCallback(() => {
    clearPreviewTimer();
    setCameraReady(false);
    setShowCameraRestart(true);
  }, [clearPreviewTimer]);

  function handleBarCodeScanned({ data }: { data: string }) {
    if (!scanning) return;
    if (data === lastScannedRef.current) return;
    lastScannedRef.current = data;
    setScanning(false);

    const batchCode = parseBatchCodeFromQr(data);
    if (!batchCode) {
      Alert.alert('Không nhận dạng được', 'QR không chứa mã lô hàng hợp lệ.', [
        { text: 'Thử lại', onPress: () => { setScanning(true); lastScannedRef.current = null; } },
      ]);
      return;
    }

    navigation.navigate('BatchSummary', { batchCode });
    setTimeout(() => { setScanning(true); lastScannedRef.current = null; }, 3000);
  }

  function handleManualSubmit() {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    navigation.navigate('BatchSummary', { batchCode: code });
    setManualCode('');
  }

  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#70b98b" />
        <Text style={styles.loadingText}>Đang kiểm tra quyền camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permText}>BlueFood cần quyền truy cập camera để quét QR</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraArea}>
        {shouldRenderCamera ? (
          <CameraView
            key={cameraKey}
            style={styles.camera}
            onCameraReady={handleCameraReady}
            onMountError={handleCameraMountError}
            onBarcodeScanned={scanning && cameraReady ? handleBarCodeScanned : undefined}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          >
            <View style={[styles.badge, { backgroundColor: online ? '#236c45' : '#9f3434' }]}>
              <Text style={styles.badgeText}>{online ? '● Online' : '⚠ Offline'}</Text>
            </View>

            <View style={styles.frameContainer}>
              <View style={styles.frame} />
              <Text style={styles.frameHint}>Đặt mã QR vào khung</Text>
            </View>
          </CameraView>
        ) : (
          <View style={[styles.camera, styles.center]}>
            <ActivityIndicator color="#70b98b" />
            <Text style={styles.loadingText}>
              {qrScreenActive ? 'Khởi động camera...' : 'Camera đang tạm dừng...'}
            </Text>
          </View>
        )}

        {shouldRenderCamera && !cameraReady && !showCameraRestart && (
          <View pointerEvents="none" style={styles.cameraLoadingOverlay}>
            <ActivityIndicator color="#70b98b" />
            <Text style={styles.loadingText}>Khởi động camera...</Text>
          </View>
        )}

        {qrScreenActive && showCameraRestart && (
          <View style={styles.cameraFallback}>
            <Text style={styles.fallbackText}>Camera chưa sẵn sàng</Text>
            <TouchableOpacity style={styles.restartBtn} onPress={restartCamera} hitSlop={10}>
              <Text style={styles.restartBtnText}>Khởi động lại camera</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.manual}>
        <Text style={styles.manualLabel}>Hoặc nhập mã lô thủ công:</Text>
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="LOT-2604-0182"
            placeholderTextColor="#66736b"
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            returnKeyType="go"
            onSubmitEditing={handleManualSubmit}
          />
          <TouchableOpacity style={styles.manualBtn} onPress={handleManualSubmit}>
            <Text style={styles.manualBtnText}>Xem</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  cameraArea: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  badge: {
    position: 'absolute', top: 16, right: 16,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  frameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  frame: {
    width: 240, height: 240,
    borderWidth: 3, borderColor: '#70b98b', borderRadius: 16,
  },
  frameHint: { color: 'rgba(255,255,255,.8)', fontSize: 13 },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,.18)',
  },
  cameraFallback: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 24,
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,.58)',
    padding: 14,
    zIndex: 10,
    elevation: 10,
  },
  fallbackText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  restartBtn: { backgroundColor: '#236c45', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  restartBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  loadingText: { color: 'rgba(255,255,255,.82)', fontSize: 13, textAlign: 'center' },
  manual: { backgroundColor: '#15231b', padding: 16, gap: 8 },
  manualLabel: { color: '#8aaa96', fontSize: 13 },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,.15)', borderRadius: 10,
    padding: 12, color: '#fff', fontSize: 14, fontFamily: 'monospace',
    backgroundColor: 'rgba(255,255,255,.07)',
  },
  manualBtn: { backgroundColor: '#236c45', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  manualBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  permText: { color: '#fff', fontSize: 15, textAlign: 'center' },
  permBtn: { backgroundColor: '#236c45', borderRadius: 10, padding: 12, paddingHorizontal: 24 },
  permBtnText: { color: '#fff', fontWeight: '700' },
});
