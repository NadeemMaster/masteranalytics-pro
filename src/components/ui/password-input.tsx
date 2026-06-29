"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn("pr-10", className)}
          autoComplete="current-password"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };

// ---------------------------------------------------------------------------
//  Password strength meter (used on signup)
// ---------------------------------------------------------------------------

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4; // 0 = very weak, 4 = strong
  label: string;
  color: string;
};

export function evaluatePasswordStrength(pw: string): PasswordStrength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const map: PasswordStrength[] = [
    { score: 0, label: "Too short", color: "bg-red-500" },
    { score: 1, label: "Weak", color: "bg-red-500" },
    { score: 2, label: "Fair", color: "bg-amber-500" },
    { score: 3, label: "Good", color: "bg-blue-500" },
    { score: 4, label: "Strong", color: "bg-green-500" },
  ];
  return map[score];
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const strength = evaluatePasswordStrength(password);
  if (!password) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex h-1.5 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-full flex-1 rounded-full transition-colors",
              i < strength.score ? strength.color : "bg-slate-200"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength:{" "}
        <span className="font-medium text-foreground">{strength.label}</span>
      </p>
    </div>
  );
}
