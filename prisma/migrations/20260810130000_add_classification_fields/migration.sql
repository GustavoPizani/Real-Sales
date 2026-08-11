-- CreateEnum
CREATE TYPE "DiscardReason" AS ENUM ('NOT_INTERESTED', 'NOT_A_CLIENT');

-- AlterEnum
ALTER TYPE "MailingContactStatus" ADD VALUE 'DISCARDED';

-- AlterTable
ALTER TABLE "active_offer_clients" ADD COLUMN     "snoozedUntil" TIMESTAMP(3),
ADD COLUMN     "discardReason" "DiscardReason";

-- AlterTable
ALTER TABLE "mailing_contacts" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN     "snoozedUntil" TIMESTAMP(3),
ADD COLUMN     "discardReason" "DiscardReason";
