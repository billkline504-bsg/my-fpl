import { Resend } from "resend";
import { env } from "../env.js";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  const { error } = await resend.emails.send({ from: env.REMINDER_FROM_EMAIL, ...params });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
