import { createClient } from '@supabase/supabase-js';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERRORS.VALIDATION_ERROR.code, 'Email hoặc mật khẩu không hợp lệ', 422);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.session) {
    return apiError(ERRORS.UNAUTHORIZED.code, 'Email hoặc mật khẩu không đúng', 401);
  }

  return apiOk({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email },
  });
}
