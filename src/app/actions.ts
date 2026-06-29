// ============================================================================
//  MasterAnalytics Pro — Logout Server Action
//  Signs the user out and redirects to /login.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
