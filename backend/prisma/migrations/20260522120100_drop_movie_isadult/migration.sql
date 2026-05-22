-- DropIndex
DROP INDEX IF EXISTS "movies_isAdult_idx";

-- AlterTable
ALTER TABLE "movies" DROP COLUMN IF EXISTS "isAdult";
