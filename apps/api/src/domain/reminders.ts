import { and, eq } from "drizzle-orm";
import {
  authUsers,
  gameweekReminders,
  gameweeks,
  leagueMemberships,
  leagues,
  profiles,
  type Db,
} from "@my-fpl/db";
import { shouldSendReminder } from "@my-fpl/shared";

type ReminderType = "days_before" | "hours_before";
type SendEmail = (params: { to: string; subject: string; html: string }) => Promise<void>;

async function getRecipientsForGameweek(db: Db, seasonId: string) {
  return db
    .select({
      leagueName: leagues.name,
      email: authUsers.email,
    })
    .from(leagues)
    .innerJoin(leagueMemberships, eq(leagueMemberships.leagueId, leagues.id))
    .innerJoin(profiles, eq(profiles.id, leagueMemberships.userId))
    .innerJoin(authUsers, eq(authUsers.id, profiles.id))
    .where(eq(leagues.seasonId, seasonId));
}

function formatDeadline(deadlineTime: Date) {
  return `${deadlineTime.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" })} UTC`;
}

function buildReminderEmail(params: { leagueName: string; gameweekNumber: number; deadlineTime: Date; appUrl: string }) {
  const deadline = formatDeadline(params.deadlineTime);
  return {
    subject: `Gameweek ${params.gameweekNumber} locks soon — ${params.leagueName}`,
    html: `<p>Gameweek ${params.gameweekNumber} in <strong>${params.leagueName}</strong> locks at ${deadline}.</p>
<p>Make any transfers you want in before then.</p>
<p><a href="${params.appUrl}">Open My FPL</a></p>`,
  };
}

async function sendRemindersForGameweek(
  db: Db,
  sendEmail: SendEmail,
  gameweek: { id: string; seasonId: string; number: number; deadlineTime: Date },
  appUrl: string,
) {
  const recipients = await getRecipientsForGameweek(db, gameweek.seasonId);

  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    if (!recipient.email) continue;
    const email = buildReminderEmail({
      leagueName: recipient.leagueName,
      gameweekNumber: gameweek.number,
      deadlineTime: gameweek.deadlineTime,
      appUrl,
    });
    try {
      await sendEmail({ to: recipient.email, subject: email.subject, html: email.html });
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

export async function runGameweekReminders(
  db: Db,
  sendEmail: SendEmail,
  config: { daysBeforeMs: number; hoursBeforeMs: number; appUrl: string },
) {
  const now = new Date();
  const upcomingGameweeks = await db.select().from(gameweeks).where(eq(gameweeks.isFinished, false));

  const offsetsByType: Record<ReminderType, number> = {
    days_before: config.daysBeforeMs,
    hours_before: config.hoursBeforeMs,
  };

  let emailsSent = 0;
  let emailsFailed = 0;
  let gameweeksReminded = 0;

  for (const type of Object.keys(offsetsByType) as ReminderType[]) {
    for (const gameweek of upcomingGameweeks) {
      const [existing] = await db
        .select()
        .from(gameweekReminders)
        .where(and(eq(gameweekReminders.gameweekId, gameweek.id), eq(gameweekReminders.type, type)));

      const eligible = shouldSendReminder({
        now,
        deadlineTime: gameweek.deadlineTime,
        offsetMs: offsetsByType[type],
        alreadySent: !!existing,
      });
      if (!eligible) continue;

      const result = await sendRemindersForGameweek(
        db,
        sendEmail,
        { id: gameweek.id, seasonId: gameweek.seasonId, number: gameweek.number, deadlineTime: gameweek.deadlineTime },
        config.appUrl,
      );
      emailsSent += result.sent;
      emailsFailed += result.failed;
      gameweeksReminded++;

      await db.insert(gameweekReminders).values({ gameweekId: gameweek.id, type });
    }
  }

  return { gameweeksReminded, emailsSent, emailsFailed };
}
