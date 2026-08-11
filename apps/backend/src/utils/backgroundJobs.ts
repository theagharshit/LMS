import cron from 'node-cron';
import { prisma, postgresPool } from '@db/services/prismaClient';
import { platformService } from '@db/services/platformService';
import { notificationService } from '@db/services/notificationService';
import { logger } from './logger';

type LocationPing = {
  studentId: string;
  studentName: string;
  latitude: number;
  longitude: number;
  location: string;
  category: string;
  updatedBy: string;
  updatedByRole: string;
  busNumber?: string;
  notes?: string;
};

const locationBuffer = new Map<string, LocationPing>();

export function bufferLocationPing(ping: LocationPing) {
  locationBuffer.set(ping.studentId, ping);
  return { buffered: true, pending: locationBuffer.size };
}

export async function flushLocationPings() {
  const pings = [...locationBuffer.values()];
  locationBuffer.clear();
  await Promise.all(
    pings.map(async (ping) => {
      const existing = await prisma.studentLocationRecord.findFirst({
        where: { studentId: ping.studentId },
      });
      const data = { ...ping, updatedAt: new Date().toISOString() };
      if (existing)
        return prisma.studentLocationRecord.update({ where: { id: existing.id }, data });
      return prisma.studentLocationRecord.create({ data: ping as any });
    }),
  );
  return pings.length;
}

export async function dispatchWeeklyParentDigests() {
  const parents = await prisma.user.findMany({
    where: { role: 'parent', isArchived: false, childrenIds: { isEmpty: false } },
    select: { id: true, childrenIds: true },
  });
  let dispatched = 0;
  for (const parent of parents) {
    for (const studentId of parent.childrenIds) {
      const [student, controls, performance, pendingHomework] = await Promise.all([
        prisma.user.findUnique({ where: { id: studentId }, select: { name: true } }),
        prisma.parentControlSettings.findUnique({ where: { studentId } }),
        platformService.performanceMatrix(studentId),
        prisma.submission.count({
          where: { studentId, status: { in: ['pending', 'draft', 'overdue'] } },
        }),
      ]);
      if (!student || controls?.weeklyDigestEmail === false) continue;
      const sent = await notificationService.dispatchNotification({
        recipientId: parent.id,
        senderName: 'Sikshya Progress Assistant',
        senderRole: 'admin',
        title: `${student.name}'s weekly progress digest`,
        body: `${student.name} completed the week with ${performance.attendancePercentage}% attendance, a ${performance.streakDays}-day learning streak, level ${performance.level}, and ${pendingHomework} pending or overdue homework item(s).`,
        category: 'ACADEMIC',
        type: 'general',
      });
      if (sent) dispatched += 1;
    }
  }
  return dispatched;
}

let jobsStarted = false;
export function startBackgroundJobs() {
  if (jobsStarted || process.env.NODE_ENV === 'test') return () => undefined;
  jobsStarted = true;
  const flushTimer = setInterval(
    () => void flushLocationPings().catch((error) => logger.error('Location flush failed', error)),
    60_000,
  );
  flushTimer.unref();
  const overdueJob = cron.schedule(
    '*/5 * * * *',
    () =>
      void platformService
        .flagOverdue()
        .catch((error) => logger.error('Overdue task failed', error)),
  );
  const quizAutoSubmitJob = cron.schedule(
    '* * * * *',
    () =>
      void platformService
        .autoSubmitExpiredQuizSessions()
        .catch((error) => logger.error('Quiz auto-submit task failed', error)),
  );
  const weeklyDigestJob = cron.schedule(
    '0 8 * * 0',
    () =>
      void dispatchWeeklyParentDigests().catch((error) =>
        logger.error('Weekly parent digest task failed', error),
      ),
    { timezone: process.env.SCHOOL_TIMEZONE || 'Asia/Kathmandu' },
  );
  const vacuumJob = cron.schedule('30 2 * * 0', async () => {
    try {
      for (const table of [
        'AttendanceRecord',
        'QuizSubmission',
        'NotificationRecord',
        'SecurityAudit',
      ]) {
        await postgresPool.query(`VACUUM ANALYZE "${table}"`);
      }
    } catch (error) {
      logger.error('VACUUM ANALYZE maintenance failed', error);
    }
  });
  return () => {
    clearInterval(flushTimer);
    overdueJob.stop();
    quizAutoSubmitJob.stop();
    weeklyDigestJob.stop();
    vacuumJob.stop();
    jobsStarted = false;
  };
}
