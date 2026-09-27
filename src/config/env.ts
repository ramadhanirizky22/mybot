import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_URL: z
    .string()
    .url("Invalid Supabase URL")
    .default("https://placeholder.supabase.co"),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1, "Supabase Anon Key is required")
    .default("placeholder-anon-key"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "Supabase Service Role Key is required")
    .default("placeholder-service-role-key"),
  TELEGRAM_BOT_TOKEN: z
    .string()
    .min(1, "Telegram Bot Token is required")
    .default("123456789:placeholder-telegram-bot-token"),
  TELEGRAM_SECRET_TOKEN: z
    .string()
    .min(16, "Secret token must be at least 16 characters")
    .default("tele_spend_placeholder_secret_token_16_chars"),
  APP_URL: z
    .string()
    .url("Invalid App URL")
    .default("http://localhost:3000"),
  TELEGRAM_BOT_USERNAME: z
    .string()
    .default("money_riki_bot"),
  GEMINI_API_KEY: z.string().optional(),
  OCR_SPACE_API_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || undefined,
  TELEGRAM_SECRET_TOKEN: process.env.TELEGRAM_SECRET_TOKEN || undefined,
  APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || undefined,
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || undefined,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
  OCR_SPACE_API_KEY: process.env.OCR_SPACE_API_KEY || undefined,
});
