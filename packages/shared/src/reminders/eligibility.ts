export function shouldSendReminder(params: {
  now: Date;
  deadlineTime: Date;
  offsetMs: number;
  alreadySent: boolean;
}): boolean {
  if (params.alreadySent) return false;

  const msUntilDeadline = params.deadlineTime.getTime() - params.now.getTime();
  return msUntilDeadline > 0 && msUntilDeadline <= params.offsetMs;
}
