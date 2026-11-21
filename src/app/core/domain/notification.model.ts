import type { IsoDate, IsoDateTime } from './date';
import type { PersonRef } from './people.model';

export type NotificationKind = 'termin' | 'przypomnienie' | 'proces' | 'zapoznanie' | 'system';

export interface AppNotification {
  readonly id: string;
  readonly recipientId: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly createdAt: IsoDateTime;
  readonly readAt?: IsoDateTime;
  readonly caseId?: string;
  readonly link?: string;
  readonly sender?: PersonRef;
}

export type ReminderRuleId =
  | 'termin-oceny'
  | 'rozmowa-wstepna'
  | 'zapoznanie'
  | 'zawiadomienie-o-terminie'
  | 'sprawozdanie';

export interface ReminderRule {
  readonly id: ReminderRuleId;
  readonly name: string;
  readonly description: string;
  readonly legalRef: string;
  readonly daysBefore: readonly number[];
  readonly enabled: boolean;
}

/** Sprawa wymagająca przypomnienia wyliczona z terminów. */
export interface ReminderCandidate {
  readonly id: string;
  readonly ruleId: ReminderRuleId;
  readonly caseId: string;
  readonly employeeName: string;
  readonly recipient: PersonRef;
  readonly dueDate: IsoDate;
  readonly title: string;
  readonly message: string;
  readonly severity: 'pilne' | 'wkrotce' | 'informacja';
  readonly lastSentAt?: IsoDateTime;
}

export interface ReminderLogEntry {
  readonly id: string;
  readonly sentAt: IsoDateTime;
  readonly sender: PersonRef;
  readonly recipient: PersonRef;
  readonly caseId: string;
  readonly employeeName: string;
  readonly title: string;
  readonly channel: 'aplikacja';
  readonly readAt?: IsoDateTime;
}
