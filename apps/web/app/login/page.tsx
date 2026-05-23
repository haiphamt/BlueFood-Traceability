"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email hoặc mật khẩu không đúng");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single()
      : { data: null };

    const dest = profile?.role === "supplier" ? "/portal" : "/dashboard";
    router.push(dest);
    router.refresh();
  }

  return (
    <main
      className="w-full h-screen flex overflow-hidden"
      style={{ backgroundColor: "#121412", fontFamily: "Manrope, sans-serif" }}
    >
      {/* ── Left: Image panel ── */}
      <div className="hidden md:block md:w-1/2 lg:w-[55%] h-full relative flex-shrink-0">
        <img
          alt="Greenhouse Farm"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdjwPYLltF4nx2u6a2euOXPcFs0gBZioiknr1rlKTpfePoKh6QnxXcuUZMVt-xtK3BLMUrY57utwvjJ_ZEZfdp97HakiCkvqaLKE3ADe_75Vl-Puvaez2_t_r7vrpp9Pvpsrauu3E77D97RDu4kNssCYqVNRQ6NrgU-SgBbCaMJBtsAcpuhsG5lFXy2A00famW6vallnTOSPpju0yDtLCZ0U1NpLHMPgbF0Z0uQxPzEZVZr6kdgN4QBkymiXhuGvwMahfp9rdiZg"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            borderRadius: "0 1.5rem 1.5rem 0",
            borderRight: "1px solid #374151",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: "0 1.5rem 1.5rem 0",
            background:
              "linear-gradient(to right, rgba(18,20,18,0.35), transparent)",
          }}
        />
      </div>

      {/* ── Right: Form panel — scrollable only on short/mobile screens ── */}
      <div
        className="w-full md:w-1/2 lg:w-[45%] h-full flex items-center justify-center overflow-y-auto"
        style={{ backgroundColor: "#121412" }}
      >
        {/* Inner card — py keeps breathing room on very short screens */}
        <div className="w-full max-w-[420px] px-8 py-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#00cc66" }}
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              BlueFood{" "}
              <span className="font-light" style={{ color: "#9ca3af" }}>
                Traceability
              </span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-5">
            <h1
              className="text-3xl text-white mb-1"
              style={{
                fontFamily:
                  '"Noto Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 1.1,
              }}
            >
              Chào mừng trở lại
            </h1>
            <p className="text-sm" style={{ color: "#9ca3af" }}>
              Đăng nhập vào tài khoản quản trị chuỗi cung ứng của bạn.
            </p>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold mb-1.5"
                style={{ color: "#f3f4f6" }}
              >
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg
                    style={{ width: 17, height: 17, color: "#9ca3af" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email của bạn"
                  className="block w-full h-11 pl-10 pr-4 border rounded-xl text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: "#1e201e",
                    borderColor: "#374151",
                    color: "#f3f4f6",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#00cc66";
                    e.target.style.boxShadow = "0 0 0 1px #00cc66";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#374151";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold"
                  style={{ color: "#f3f4f6" }}
                >
                  Mật khẩu
                </label>
                <button
                  type="button"
                  className="text-xs font-medium"
                  style={{ color: "#00cc66" }}
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg
                    style={{ width: 17, height: 17, color: "#9ca3af" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="block w-full h-11 pl-10 pr-11 border rounded-xl text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: "#1e201e",
                    borderColor: "#374151",
                    color: "#f3f4f6",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#00cc66";
                    e.target.style.boxShadow = "0 0 0 1px #00cc66";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#374151";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                  style={{ color: "#9ca3af" }}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <svg
                      style={{ width: 17, height: 17 }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  ) : (
                    <svg
                      style={{ width: 17, height: 17 }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                      <path
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: "#00cc66" }}
              />
              <label
                htmlFor="remember-me"
                className="text-sm select-none"
                style={{ color: "#9ca3af" }}
              >
                Ghi nhớ tôi
              </label>
            </div>

            {/* Error */}
            {error && (
              <div
                className="px-4 py-2.5 rounded-xl text-sm border"
                style={{
                  backgroundColor: "rgba(220,38,38,0.1)",
                  borderColor: "rgba(220,38,38,0.3)",
                  color: "#fca5a5",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center rounded-xl text-sm font-bold text-white tracking-wide transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#00994d" }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#008040";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#00994d";
              }}
            >
              {loading ? "Đang đăng nhập..." : "ĐĂNG NHẬP"}
            </button>
          </form>

          {/* ── Social login divider ── */}
          <div className="mt-5 relative flex items-center gap-3">
            <div
              className="flex-1 border-t"
              style={{ borderColor: "#374151" }}
            />
            <span
              className="text-xs whitespace-nowrap"
              style={{ color: "#9ca3af" }}
            >
              Hoặc đăng nhập với
            </span>
            <div
              className="flex-1 border-t"
              style={{ borderColor: "#374151" }}
            />
          </div>

          {/* ── Social buttons (UI-only, no OAuth) ── */}
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            {/* Apple */}
            <button
              type="button"
              aria-disabled="true"
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border text-sm font-semibold transition-colors"
              style={{
                backgroundColor: "#1e201e",
                borderColor: "#374151",
                color: "#f3f4f6",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#272a27";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#1e201e";
              }}
            >
              <svg
                aria-hidden="true"
                style={{ width: 18, height: 18 }}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.43.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.214.052-2.676.818-3.545 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.572-1.702z" />
              </svg>
              Apple
            </button>

            {/* Google */}
            <button
              type="button"
              aria-disabled="true"
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border text-sm font-semibold transition-colors"
              style={{
                backgroundColor: "#1e201e",
                borderColor: "#374151",
                color: "#f3f4f6",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#272a27";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#1e201e";
              }}
            >
              <svg
                aria-hidden="true"
                style={{ width: 18, height: 18 }}
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
