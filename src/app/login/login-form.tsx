"use client";

// ============================================================================
//  MasterAnalytics Pro — Login Form (Client Component)
//  Handles email/password sign-in via Supabase browser client.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Surface error params from auth callback / middleware redirects
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "auth_callback") {
      toast.error("Email verification failed", {
        description:
          "The confirmation link may have expired. Please try signing in or request a new link.",
        duration: 8000,
      });
    } else if (err === "config") {
      toast.error("Configuration error", {
        description:
          "Supabase environment variables are not set. Contact your admin.",
        duration: 10000,
      });
    }
  }, [searchParams]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      // Basic validation
      if (!email || !password) {
        toast.error("Please enter both email and password.");
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          // Map common Supabase auth errors to friendly messages
          const msg = error.message.toLowerCase();
          if (msg.includes("invalid login credentials")) {
            toast.error("Invalid email or password.", {
              description: "Please check your credentials and try again.",
            });
          } else if (msg.includes("email not confirmed")) {
            toast.error("Email not confirmed", {
              description:
                "Check your inbox for a confirmation link, or contact your admin.",
              duration: 8000,
            });
          } else if (msg.includes("too many requests")) {
            toast.error("Too many attempts", {
              description: "Please wait a minute before trying again.",
            });
          } else {
            toast.error("Sign-in failed", { description: error.message });
          }
          return;
        }

        if (data.user) {
          toast.success("Signed in!", {
            description: "Redirecting to your dashboard…",
          });

          // Read redirect target (validated to be a relative path)
          const redirect = searchParams.get("redirect");
          const safeRedirect =
            redirect && redirect.startsWith("/") && !redirect.startsWith("//")
              ? redirect
              : "/dashboard";

          // Force a full reload so middleware + server components pick up the
          // new session cookie.
          router.push(safeRedirect);
          router.refresh();
        }
      } catch (err) {
        toast.error("Something went wrong", {
          description:
            err instanceof Error ? err.message : "Please try again.",
        });
      } finally {
        setLoading(false);
      }
    },
    [email, password, loading, router, searchParams, supabase]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={() =>
              toast.info("Password reset", {
                description:
                  "Contact your admin or use the Supabase reset link via /auth/reset-password (coming soon).",
              })
            }
            className="text-xs text-blue-600 hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Sign In
          </>
        )}
      </Button>
    </form>
  );
}
