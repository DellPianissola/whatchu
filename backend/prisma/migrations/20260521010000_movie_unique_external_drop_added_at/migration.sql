-- Remove duplicatas existentes por (addedById, externalId) antes da constraint,
-- mantendo o registro mais antigo de cada grupo.
DELETE FROM "movies" m
USING "movies" m2
WHERE m."externalId" IS NOT NULL
  AND m."addedById"  = m2."addedById"
  AND m."externalId" = m2."externalId"
  AND m."createdAt"  > m2."createdAt";

-- DropColumn
ALTER TABLE "movies" DROP COLUMN "addedAt";

-- CreateIndex (UNIQUE)
CREATE UNIQUE INDEX "movies_addedById_externalId_key" ON "movies"("addedById", "externalId");
