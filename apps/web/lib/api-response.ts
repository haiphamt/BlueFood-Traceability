import { NextResponse } from 'next/server';

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const ERRORS = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'Không có quyền truy cập', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Không tìm thấy', status: 404 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', status: 422 },
  INTERNAL: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống', status: 500 },
  DUPLICATE: { code: 'DUPLICATE', message: 'Dữ liệu đã tồn tại', status: 409 },
} as const;
