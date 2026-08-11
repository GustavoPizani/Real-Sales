-- CreateEnum
CREATE TYPE "MailingContactStatus" AS ENUM ('AVAILABLE', 'CLAIMED');

-- CreateTable
CREATE TABLE "mailing_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailing_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing_contacts" (
    "id" TEXT NOT NULL,
    "mailingListId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "MailingContactStatus" NOT NULL DEFAULT 'AVAILABLE',
    "clientId" TEXT,
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailing_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mailing_contacts_clientId_key" ON "mailing_contacts"("clientId");

-- CreateIndex
CREATE INDEX "mailing_contacts_mailingListId_idx" ON "mailing_contacts"("mailingListId");

-- CreateIndex
CREATE INDEX "mailing_contacts_status_idx" ON "mailing_contacts"("status");

-- AddForeignKey
ALTER TABLE "mailing_lists" ADD CONSTRAINT "mailing_lists_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_contacts" ADD CONSTRAINT "mailing_contacts_mailingListId_fkey" FOREIGN KEY ("mailingListId") REFERENCES "mailing_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_contacts" ADD CONSTRAINT "mailing_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_contacts" ADD CONSTRAINT "mailing_contacts_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
