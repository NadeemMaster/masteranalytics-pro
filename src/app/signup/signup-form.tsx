"use client";

// ============================================================================
//  MasterAnalytics Pro — Signup Form (Client Component)
//  Handles email/password registration via Supabase browser client.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PasswordInput,
  PasswordStrengthBar,
} from "@/components/ui/password-input";

export function SignupForm() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      // Validation
      const emailVal = email.trim().toLowerCase();
      if (!emailVal || !password) {
        toast.error("Please fill in all fields.");
        return;
      }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
      if (!emailOk) {
        toast.error("Please enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        toast.error("Passwords do not match.");
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase.auth.signUp({
          email: emailVal,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("already registered") || msg.includes("already been registered")) {
            toast.error("Email already registered", {
              description: "Try signing in instead, or use a different email.",
            });
          } else if (msg.includes("password should be at least")) {
            toast.error("Password too weak", {
              description: "Use at least 8 characters with a mix of letters, numbers, and symbols.",
            });
          } else if (msg.includes("rate limit") || msg.includes("too many")) {
            toast.error("Too many attempts", {
              description: "Please wait a minute before trying again.",
            });
          } else {
            toast.error("Sign-up failed", { description: error.message });
          }
          return;
        }

        // Two outcomes:
        // 1. Email confirmation REQUIRED → data.session is null, data.user exists
        // 2. Email confirmation DISABLED → data.session is set (auto-signed-in)
        if (data.session) {
          toast.success("Account created!", {
            description: "Redirecting to your dashboard…",
          });
          router.push("/dashboard");
          router.refresh();
        } else if (data.user) {
          setNeedsConfirmation(true);
          toast.success("Check your email", {
            description: `We sent a confirmation link to ${emailVal}.`,
            duration: 10000,
          });
        }
      } catch (err) {
        toast.error("Something went wrong", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      } finally {
        setLoading(false);
      }
    },
    [email, password, confirm, loading, router, supabase]
  );

  if (needsConfirmation) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
          <UserPlus className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Verify your email</h3>
          <p className="mt-1 text-sm text-slate-500">
            We sent a confirmation link to{" "}
            <span className="font-medium text-slate-700">{email}</span>.
            Click the link in the email to activate your account.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setNeedsConfirmation(false);
            setEmail("");
            setPassword("");
            setConfirm("");
          }}
        >
          Back to sign-up
        </Button>
      </div>
    );
  }

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
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <PasswordStrengthBar password={password} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <PasswordInput
          id="confirm"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading}
          aria-invalid={confirm.length > 0 && confirm !== password}
        />
        {confirm.length > 0 && confirm !== password && (
          <p className="text-xs text-red-500">Passwords do not match</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Create Account
          </>
        )}
      </Button>

      <p className="text-center text-xs text-slate-500">
        By creating an account, you agree that your campaign data will be
        stored securely and isolated to your account.
      </p>
    </form>
  );
}
