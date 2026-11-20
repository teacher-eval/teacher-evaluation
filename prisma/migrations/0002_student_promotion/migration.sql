-- AlterTable
ALTER TABLE "students" ADD COLUMN "last_promoted_academic_year" VARCHAR(20),
ADD COLUMN "graduated_at" TIMESTAMPTZ(3);
