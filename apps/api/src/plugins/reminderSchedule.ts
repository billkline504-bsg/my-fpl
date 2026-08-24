import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import cron from "node-cron";
import { runGameweekReminders } from "../domain/reminders.js";
import { sendEmail } from "../lib/resend.js";
import { env } from "../env.js";

export default fp(async (fastify: FastifyInstance) => {
  async function runReminders() {
    try {
      const result = await runGameweekReminders(fastify.db, sendEmail, {
        daysBeforeMs: env.REMINDER_DAYS_BEFORE * 24 * 60 * 60 * 1000,
        hoursBeforeMs: env.REMINDER_HOURS_BEFORE * 60 * 60 * 1000,
        appUrl: env.APP_BASE_URL,
      });
      if (result.gameweeksReminded > 0) {
        fastify.log.info({ result }, "Sent gameweek deadline reminders");
      }
    } catch (err) {
      fastify.log.error({ err }, "Gameweek reminder run failed");
    }
  }

  void runReminders();
  cron.schedule("*/15 * * * *", runReminders);
});
