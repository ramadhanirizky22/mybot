import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("Invalid Supabase URL")
    .default("https://placeholder.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
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
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("Invalid App URL")
    .default("http://localhost:3000"),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z
    .string()
    .default("TeleSpendBot"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_SECRET_TOKEN: process.env.TELEGRAM_SECRET_TOKEN,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
});
