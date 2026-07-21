-- Permite configurar o aviso por tarefa (sobrescrevendo o padrão do usuário)
-- e repetir a notificação enquanto a tarefa estiver atrasada.
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reminderMinutesBefore" INTEGER;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "overdueRepeatMinutes" INTEGER;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "lastOverdueNotifiedAt" TIMESTAMP(3);
