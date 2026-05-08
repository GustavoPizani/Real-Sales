-- Add reminder tracking to tasks
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);

-- Add configurable reminder window to users (default 30 minutes)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "taskReminderMinutes" INTEGER NOT NULL DEFAULT 30;
