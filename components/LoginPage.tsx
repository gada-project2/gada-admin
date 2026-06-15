"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import GadaLogo from "./GadaLogo";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });

      const data = await res.json() as { success: boolean; message?: string };

      if (!res.ok || !data.success) {
        setServerError(data.message ?? "Invalid credentials");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Unable to connect. Please try again.");
    }
  }

  return (
    <div className="flex h-screen w-full">
      {/* Left panel */}
      <div
        className="hidden md:flex w-1/2 items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}
      >
        <GadaLogo variant="light" size={220} />
      </div>

      {/* Right panel */}
      <div
        className="flex w-full md:w-1/2 items-center justify-center"
        style={{ backgroundColor: "#f0f0f0" }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-10"
          style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 32px rgba(0,0,0,0.08)" }}
        >
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Gada Logo" width={140} height={77} style={{ objectFit: "contain" }} />
          </div>

          <h1 className="text-2xl font-extrabold mb-6" style={{ color: "#1a1a1a" }}>
            SIGN IN
          </h1>

          {serverError && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm font-medium"
              style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: "#1a1a1a" }}>
                Email
              </label>
              <div
                className="flex items-center border rounded-lg px-3 py-2.5"
                style={{
                  borderColor: errors.email ? "#ef4444" : "#e0e0e0",
                  backgroundColor: "#fafafa",
                }}
              >
                <input
                  type="email"
                  placeholder="admin@example.com"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "#1a1a1a" }}
                  {...register("email")}
                />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m2 7 10 7 10-7" />
                </svg>
              </div>
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: "#1a1a1a" }}>
                Password
              </label>
              <div
                className="flex items-center border rounded-lg px-3 py-2.5"
                style={{
                  borderColor: errors.password ? "#ef4444" : "#e0e0e0",
                  backgroundColor: "#fafafa",
                }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "#1a1a1a" }}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>{errors.password.message}</p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg text-white font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#1a1a1a" }}
              >
                {isSubmitting ? "Signing in…" : "Sign In"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
