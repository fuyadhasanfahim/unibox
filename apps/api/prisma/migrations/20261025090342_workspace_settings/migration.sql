-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "defaultLocale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'UTC';
