import { revalidatePath } from 'next/cache';

export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function batchCodeFromRelation(row: { batch_code?: string | null; batches?: unknown } | null | undefined) {
  if (!row) return null;
  if (row.batch_code) return row.batch_code;
  const batch = firstRelation(row.batches as { batch_code?: string | null } | { batch_code?: string | null }[] | null);
  return batch?.batch_code ?? null;
}

export function revalidateCertificateViews(batchCode?: string | null) {
  revalidatePath('/certificates');
  revalidatePath('/dashboard');
  revalidatePath('/reports');

  if (!batchCode) return;
  revalidatePath(`/batches/${batchCode}`);
  revalidatePath(`/trace/${batchCode}`);
  revalidatePath(`/api/public/trace/${batchCode}`);
}
