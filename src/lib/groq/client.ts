// ============================================================================
//  MasterAnalytics Pro — Groq AI Client
//  Wraps the Groq SDK for LLaMA-3 insight generation.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import Groq from "groq-sdk";

let client: Groq | null = null;

/**
 * Get the singleton Groq client.
 * Throws if GROQ_API_KEY is not set.
 */
export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith("YOUR-")) {
    throw new Error(
      "Missing GROQ_API_KEY. Add it to .env.local (see .env.example)."
    );
  }
  if (!client) {
    client = new Groq({ apiKey });
  }
  return client;
}

/**
 * The model to use for insight generation.
 * Defaults to llama-3.3-70b-versatile (set via GROQ_MODEL env var).
 */
export function getGroqModel(): string {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}
