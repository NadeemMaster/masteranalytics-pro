"use client";

// ============================================================================
//  MasterAnalytics Pro — User Menu (avatar dropdown)
//  Shows the user's email + a Logout button. Used in the dashboard header.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useState, useTransition } from "react";
import { LogOut, User, ChevronDown, Loader2 } from "lucide-react";

import { logout } from "@/app/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(email: string | undefined | null): string {
  if (!email) return "U";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return email.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function UserMenu({ email }: { email: string | null | undefined }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-10 items-center gap-2 px-2 hover:bg-slate-100"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-semibold text-white">
              {initials(email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 sm:inline">
            {email ?? "User"}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-slate-500">
          Signed in as
          <div className="truncate text-sm font-semibold text-slate-900">
            {email ?? "Unknown user"}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled
          className="text-slate-500"
        >
          <User className="h-4 w-4" />
          Profile
          <span className="ml-auto text-xs text-slate-400">soon</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:bg-red-50 focus:text-red-700"
          disabled={pending}
          onClick={() => startTransition(() => logout())}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
