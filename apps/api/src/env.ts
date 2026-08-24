import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  REMINDER_FROM_EMAIL: z.string().min(1).default("My FPL <reminders@my-fpl.app>"),
  REMINDER_DAYS_BEFORE: z.coerce.number().default(1),
  REMINDER_HOURS_BEFORE: z.coerce.number().default(2),
  APP_BASE_URL: z.string().url().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);
