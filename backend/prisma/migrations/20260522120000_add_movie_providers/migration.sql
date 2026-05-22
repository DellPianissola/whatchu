-- AlterTable
ALTER TABLE "movies"
ADD COLUMN "providers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "providersUpdatedAt" TIMESTAMP(3);
