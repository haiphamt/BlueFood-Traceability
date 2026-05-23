import NetInfo from '@react-native-community/netinfo';
import { API_HEALTH_PATH, buildApiUrl } from './config';

type ReachabilityStatus = 'unknown' | 'online' | 'offline';
type NetworkCallback = (online: boolean) => void;

const subscribers = new Set<NetworkCallback>();

let apiReachability: ReachabilityStatus = 'unknown';
let pendingReachabilityCheck: Promise<boolean> | null = null;
let lastReachabilityCheckAt = 0;

const REACHABILITY_CACHE_MS = 1500;
const DEFAULT_TIMEOUT_MS = 3500;

function notifySubscribers(online: boolean) {
  subscribers.forEach((callback) => callback(online));
}

function setApiReachability(next: ReachabilityStatus) {
  if (apiReachability === next) return;
  apiReachability = next;
  notifySubscribers(next === 'online');
}

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function pingApi(timeoutMs: number): Promise<boolean> {
  const { signal, clear } = timeoutSignal(timeoutMs);
  try {
    const res = await fetch(buildApiUrl(API_HEALTH_PATH), {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      cache: 'no-store',
      signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clear();
  }
}

async function doReachabilityCheck(timeoutMs: number): Promise<boolean> {
  const state = await NetInfo.fetch();
  const hasNetwork = state.isConnected === true && state.isInternetReachable !== false;

  if (!hasNetwork) {
    setApiReachability('offline');
    return false;
  }

  const reachable = await pingApi(timeoutMs);
  setApiReachability(reachable ? 'online' : 'offline');
  return reachable;
}

export function getCachedOnlineState(): boolean {
  return apiReachability === 'online';
}

export async function checkApiReachability(options: { force?: boolean; timeoutMs?: number } = {}): Promise<boolean> {
  const now = Date.now();
  if (
    !options.force &&
    apiReachability !== 'unknown' &&
    now - lastReachabilityCheckAt < REACHABILITY_CACHE_MS
  ) {
    return apiReachability === 'online';
  }

  if (pendingReachabilityCheck) return pendingReachabilityCheck;

  lastReachabilityCheckAt = now;
  pendingReachabilityCheck = doReachabilityCheck(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    .catch(() => {
      setApiReachability('offline');
      return false;
    })
    .finally(() => {
      pendingReachabilityCheck = null;
    });

  return pendingReachabilityCheck;
}

export async function isOnline(): Promise<boolean> {
  return checkApiReachability({ force: true });
}

export function subscribeToNetworkChanges(callback: (online: boolean) => void) {
  subscribers.add(callback);
  callback(getCachedOnlineState());

  const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected === false || state.isInternetReachable === false) {
      setApiReachability('offline');
      return;
    }

    void checkApiReachability({ force: true });
  });

  void checkApiReachability();

  return () => {
    subscribers.delete(callback);
    unsubscribeNetInfo();
  };
}

export function isNetworkRequestError(error: unknown): boolean {
  const candidate = error as { message?: string; name?: string; isNetworkError?: boolean } | null;
  const message = candidate?.message ?? '';

  return (
    candidate?.isNetworkError === true ||
    candidate?.name === 'AbortError' ||
    /Network request failed/i.test(message) ||
    /Failed to fetch/i.test(message) ||
    /API reachability timeout/i.test(message) ||
    /Unable to connect to the API/i.test(message)
  );
}

export function handleNetworkRequestFailed(error?: unknown) {
  if (error && !isNetworkRequestError(error)) return;
  setApiReachability('offline');
  void checkApiReachability({ force: true });
}
