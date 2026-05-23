import { NextResponse } from 'next/server';
import { apiError, ERRORS } from '@/lib/api-response';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const service = createSupabaseServiceClient();
  const { data: cert, error } = await service
    .from('certificates')
    .select('id, file_url, storage_path')
    .eq('id', params.id)
    .single();

  if (error || !cert) return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy chứng chỉ', 404);
  if (cert.file_url) return NextResponse.redirect(cert.file_url);
  if (!cert.storage_path) return apiError(ERRORS.NOT_FOUND.code, 'Chứng chỉ chưa có file', 404);

  const { data: signed, error: signedError } = await service.storage
    .from('certificates')
    .createSignedUrl(cert.storage_path, 60);

  if (signedError || !signed?.signedUrl) {
    return apiError(ERRORS.INTERNAL.code, signedError?.message ?? 'Không thể tạo link tải file', 500);
  }

  return NextResponse.redirect(signed.signedUrl);
}
