'use client';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <div className="admin-card rounded-xl p-6 max-w-md w-full text-center">
        <p className="text-lg font-semibold mb-1 text-red-600 dark:text-[#ffb4ab]">Đã xảy ra lỗi</p>
        <p className="text-sm mb-4 admin-muted">{error.message}</p>
        <button
          onClick={reset}
          className="admin-primary-button px-4 py-2 rounded-lg text-sm font-medium"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
