import { keccak256, toUtf8Bytes } from 'ethers';

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortKeys(v)])
  );
}

export function buildHash(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(sortKeys(payload));
  return keccak256(toUtf8Bytes(canonical));
}

export function buildCanonical(payload: Record<string, unknown>): string {
  return JSON.stringify(sortKeys(payload));
}
