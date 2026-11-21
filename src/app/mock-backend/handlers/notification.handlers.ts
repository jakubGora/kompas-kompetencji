import type { ReminderSendResult } from '@core/api/api.types';
import type { AppNotification, ReminderLogEntry, ReminderRule } from '@core/domain/notification.model';
import { requireHr } from '../access';
import { historyEvent, personRef } from '../engine/case-factory';
import { reminderCandidates } from '../engine/reminders';
import { newId } from '../engine/text';
import { badRequest, notFound } from '../http';
import type { MockRouter } from '../router';

const MAX_NOTE_LENGTH = 400;

export function registerNotificationRoutes(router: MockRouter): void {
  router
    .get('/notifications', ({ db, user }) =>
      db.state.notifications
        .filter((notification) => notification.recipientId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    )
    .post('/notifications/read-all', ({ db, user }) => {
      const now = db.now();
      db.update((state) => ({
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.recipientId === user.id && !notification.readAt ? { ...notification, readAt: now } : notification,
        ),
      }));
      return { ok: true };
    })
    .post('/notifications/:id/read', ({ db, user, params }) => {
      const target = db.state.notifications.find((n) => n.id === params['id'] && n.recipientId === user.id);
      if (!target) throw notFound('powiadomienie');
      const updated: AppNotification = target.readAt ? target : { ...target, readAt: db.now() };
      db.update((state) => ({
        ...state,
        notifications: state.notifications.map((notification) => (notification.id === target.id ? updated : notification)),
      }));
      return updated;
    })
    .get('/reminders/rules', ({ db, user }) => {
      requireHr(user);
      return db.state.reminderRules;
    })
    .put('/reminders/rules/:id', ({ db, user, params, body }) => {
      requireHr(user);
      const rule = db.state.reminderRules.find((candidate) => candidate.id === params['id']);
      if (!rule) throw notFound('reguła przypomnień');
      const input = (body ?? {}) as Partial<Pick<ReminderRule, 'enabled' | 'daysBefore'>>;
      const updated: ReminderRule = {
        ...rule,
        ...(typeof input.enabled === 'boolean' ? { enabled: input.enabled } : {}),
        ...(Array.isArray(input.daysBefore)
          ? { daysBefore: input.daysBefore.filter((day) => Number.isInteger(day) && day >= 0 && day <= 60).sort((a, b) => b - a) }
          : {}),
      };
      db.update((state) => ({
        ...state,
        reminderRules: state.reminderRules.map((candidate) => (candidate.id === rule.id ? updated : candidate)),
      }));
      return updated;
    })
    .get('/reminders/candidates', ({ db, user }) => {
      requireHr(user);
      const { cases, reminderRules, reminderLog, today } = db.state;
      return reminderCandidates(cases, reminderRules, reminderLog, today);
    })
    .get('/reminders/log', ({ db, user }) => {
      requireHr(user);
      const readAt = new Map(db.state.notifications.map((notification) => [notification.id, notification.readAt]));
      return db.state.reminderLog
        .map((entry) => {
          const read = readAt.get(entry.id);
          return read ? { ...entry, readAt: read } : entry;
        })
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    })
    .post('/reminders/send', ({ db, user, body }): ReminderSendResult => {
      requireHr(user);
      const input = (body ?? {}) as { candidateIds?: unknown; note?: unknown };
      const ids = Array.isArray(input.candidateIds) ? input.candidateIds.filter((id): id is string => typeof id === 'string') : [];
      if (ids.length === 0) throw badRequest('Wybierz co najmniej jedno przypomnienie.');
      const note = typeof input.note === 'string' ? input.note.trim().slice(0, MAX_NOTE_LENGTH) : '';
      const { cases, reminderRules, reminderLog, today } = db.state;
      const selected = reminderCandidates(cases, reminderRules, reminderLog, today).filter((candidate) => ids.includes(candidate.id));
      const now = db.now();
      const sender = personRef(user);
      const notifications: AppNotification[] = [];
      const log: ReminderLogEntry[] = [];
      for (const candidate of selected) {
        const id = newId('n');
        notifications.push({
          id,
          recipientId: candidate.recipient.id,
          kind: 'przypomnienie',
          title: candidate.title,
          body: note ? `${candidate.message}\n\n${note}` : candidate.message,
          createdAt: now,
          caseId: candidate.caseId,
          link: `/oceny/${candidate.caseId}`,
          sender,
        });
        log.push({
          id,
          sentAt: now,
          sender,
          recipient: candidate.recipient,
          caseId: candidate.caseId,
          employeeName: candidate.employeeName,
          title: candidate.title,
          channel: 'aplikacja',
        });
      }
      db.update((state) => ({
        ...state,
        notifications: [...notifications, ...state.notifications],
        reminderLog: [...log, ...state.reminderLog],
        cases: state.cases.map((c) => {
          const sent = selected.filter((candidate) => candidate.caseId === c.id);
          return sent.length === 0
            ? c
            : {
                ...c,
                history: [
                  ...c.history,
                  ...sent.map((candidate) =>
                    historyEvent(now, sender, 'przypomnienie', `Kadry wysłały przypomnienie do ${candidate.recipient.fullName}: ${candidate.title}.`),
                  ),
                ],
              };
        }),
      }));
      return { sent: selected.length };
    });
}
