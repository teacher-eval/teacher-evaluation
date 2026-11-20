-- AlterTable
ALTER TABLE "students" ADD COLUMN "semesters_completed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "last_completed_period_key" VARCHAR(50);

-- Initialize existing students based on their current year level
UPDATE "students"
SET "semesters_completed" = ("year_level" - 1) * 2,
    "last_completed_period_key" = '2026-2027_1st'
WHERE "status" = 'active';
