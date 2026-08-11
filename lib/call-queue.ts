// lib/call-queue.ts
// Compartilhado entre as filas de atendimento de Oferta Ativa e Mailing.
import { z } from 'zod';

export const outcomeSchema = z.enum(['INTERESTED', 'NO_ANSWER', 'NOT_INTERESTED', 'NOT_A_CLIENT', 'SNOOZE']);
export type Outcome = z.infer<typeof outcomeSchema>;

export function snoozeUntilDate(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 6);
  return d;
}
