-- ────────────────────────────────────────────────────────────────────────────
-- Migração: separar Pendência (PendingRegistration) de Identidade (User)
--
-- Mudanças:
--   1. Limpa tokens de verificação obsoletos (EMAIL_VERIFICATION)
--   2. Trata duplicatas de email em users (mantém o mais antigo, deleta o resto)
--   3. Adiciona UNIQUE em users.email
--   4. Dropa coluna emailVerified (todo User pós-migração é considerado verificado)
--   5. Remove EMAIL_VERIFICATION do enum TokenType
--   6. Cria tabela pending_registrations
--
-- Tratamento dos usuários existentes:
--   Os 4-5 usuários reais que já existem são considerados verificados implicitamente.
--   Caso haja duplicatas de email (cenário de dev), mantém-se o mais antigo
--   (com seus profile/movies/etc) e remove os demais por cascade.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Limpar tokens EMAIL_VERIFICATION (não usados mais — verificação vira PendingRegistration)
DELETE FROM "verification_tokens" WHERE "type" = 'EMAIL_VERIFICATION';

-- 2. Dedupe de emails — mantém o User mais antigo, deleta os outros (cascade limpa profile/movies)
DELETE FROM "users" a
USING "users" b
WHERE a."email" = b."email"
  AND a."createdAt" > b."createdAt";

-- 3. Adicionar constraint UNIQUE em email
ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");

-- 4. Dropar coluna emailVerified — todos os Users restantes são "verificados" implicitamente
ALTER TABLE "users" DROP COLUMN "emailVerified";

-- 5. Remover EMAIL_VERIFICATION do enum TokenType
--    Postgres não permite DROP VALUE em enum diretamente — recria o tipo.
ALTER TYPE "TokenType" RENAME TO "TokenType_old";
CREATE TYPE "TokenType" AS ENUM ('PASSWORD_RESET', 'EMAIL_CHANGE');
ALTER TABLE "verification_tokens" ALTER COLUMN "type" TYPE "TokenType" USING "type"::text::"TokenType";
DROP TYPE "TokenType_old";

-- 6. Criar tabela pending_registrations
CREATE TABLE "pending_registrations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_registrations_token_key" ON "pending_registrations"("token");
CREATE INDEX "pending_registrations_email_idx" ON "pending_registrations"("email");
CREATE INDEX "pending_registrations_expiresAt_idx" ON "pending_registrations"("expiresAt");
