import { NextResponse } from 'next/server';
import { apiError, ERRORS } from '@/lib/api-response';
import { requirePortalApiContext } from '@/lib/portal';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const result = await requirePortalApiContext();
  if ('error' in result) return result.error;
  const { context } = result;

  const { data: cert, error } = await context.supabase
    .from('certificates')
    .select('id, supplier_id, storage_path')
    .eq('id', params.id)
    .in('supplier_id', context.supplierIds)
    .single();

  if (error || !cert?.storage_path) return apiError(ERRORS.NOT_FOUND.code, ERRORS.NOT_FOUND.message, 404);

  const { data, error: signedError } = await context.supabase.storage
    .from('certificates')
    .createSignedUrl(cert.storage_path, 3600);

  if (signedError || !data?.signedUrl) return apiError(ERRORS.INTERNAL.code, signedError?.message ?? 'Không tạo được signed URL', 500);
  return NextResponse.redirect(data.signedUrl);
}
