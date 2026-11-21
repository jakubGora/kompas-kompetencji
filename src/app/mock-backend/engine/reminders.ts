import { describeDueIn, diffInDays, formatDatePl, type IsoDate } from '@core/domain/date';
import type { ReminderCandidate, ReminderLogEntry, ReminderRule } from '@core/domain/notification.model';
import { currentStepId } from '@core/domain/workflow';
import type { StoredCase } from './case-factory';

const LOOKAHEAD_DAYS = 31;

function severity(due: IsoDate, today: IsoDate): ReminderCandidate['severity'] {
  const days = diffInDays(due, today);
  if (days <= 3) return 'pilne';
  if (days <= 14) return 'wkrotce';
  return 'informacja';
}

/** Sprawy, które według reguł wymagają przypomnienia oceniającemu (wylicza „serwer”). */
export function reminderCandidates(
  cases: readonly StoredCase[],
  rules: readonly ReminderRule[],
  log: readonly ReminderLogEntry[],
  today: IsoDate,
): ReminderCandidate[] {
  const enabled = new Set(rules.filter((rule) => rule.enabled).map((rule) => rule.id));
  const candidates: ReminderCandidate[] = [];
  const lastSent = (caseId: string, title: string) =>
    log
      .filter((entry) => entry.caseId === caseId && entry.title.startsWith(title.slice(0, 12)))
      .map((entry) => entry.sentAt)
      .sort()
      .at(-1);

  for (const c of cases) {
    if (c.status === 'zakonczona') continue;
    const step = currentStepId(c);
    const name = c.employee.fullName;
    const push = (ruleId: ReminderCandidate['ruleId'], due: IsoDate, title: string, message: string) => {
      const lastSentAt = lastSent(c.id, title);
      candidates.push({
        id: `${c.id}:${ruleId}`,
        ruleId,
        caseId: c.id,
        employeeName: name,
        recipient: c.evaluator,
        dueDate: due,
        title,
        message,
        severity: severity(due, today),
        ...(lastSentAt ? { lastSentAt } : {}),
      });
    };

    const preliminaryPending =
      c.path === 'periodic'
        ? ['stanowisko', 'kryteria', 'rozmowa-wstepna'].includes(step)
        : step === 'rozmowa-wstepna';
    if (enabled.has('rozmowa-wstepna') && preliminaryPending && diffInDays(c.deadlines.preliminaryDueDate, today) <= LOOKAHEAD_DAYS) {
      push(
        'rozmowa-wstepna',
        c.deadlines.preliminaryDueDate,
        `Rozmowa wstępna do ${formatDatePl(c.deadlines.preliminaryDueDate)}`,
        `${name}: rozmowa i zapoznanie z kryteriami ${describeDueIn(c.deadlines.preliminaryDueDate, today)}.`,
      );
    }
    if (enabled.has('termin-oceny') && !preliminaryPending && diffInDays(c.deadlines.dueDate, today) <= LOOKAHEAD_DAYS && !c.conclusion.sheetGeneratedAt) {
      push(
        'termin-oceny',
        c.deadlines.dueDate,
        `Termin oceny ${formatDatePl(c.deadlines.dueDate)}`,
        `${name}: termin sporządzenia oceny ${describeDueIn(c.deadlines.dueDate, today)}. Obecny krok: ${step}.`,
      );
    }
    if (enabled.has('zapoznanie') && c.conclusion.sheetGeneratedAt && !c.conclusion.employeeAcknowledgedAt) {
      const due = c.conclusion.draftedAt ?? today;
      push('zapoznanie', due, 'Zapoznanie z oceną', `${name}: arkusz wygenerowany — zapoznaj ocenianego z oceną niezwłocznie.`);
    }
    for (const extension of c.deadlines.extensions) {
      if (enabled.has('zawiadomienie-o-terminie') && !extension.employeeNotifiedAt) {
        push(
          'zawiadomienie-o-terminie',
          today,
          'Zawiadomienie o nowym terminie',
          `${name}: termin przedłużono o ${extension.days} dni — zawiadom ocenianego pisemnie (§ 8).`,
        );
      }
    }
    const reportDue = c.preliminary.reportWindow?.to;
    if (enabled.has('sprawozdanie') && c.path === 'first' && reportDue && c.report.status !== 'zlozone' && diffInDays(reportDue, today) <= 14) {
      push('sprawozdanie', reportDue, `Sprawozdanie do ${formatDatePl(reportDue)}`, `${name}: termin złożenia sprawozdania ${describeDueIn(reportDue, today)}.`);
    }
  }
  return candidates.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
