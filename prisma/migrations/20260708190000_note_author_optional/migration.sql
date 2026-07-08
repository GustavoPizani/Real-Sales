-- AlterTable
ALTER TABLE "notes" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "notes" ADD COLUMN     "authorName" TEXT;

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_authorId_fkey";

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
