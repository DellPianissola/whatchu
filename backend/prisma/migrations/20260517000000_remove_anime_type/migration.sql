-- Remove o tipo ANIME do enum MovieType.
-- Decisão de produto: animes deixam de ser tipo próprio e viram filtro
-- (gênero virtual) sobre filmes/séries no provider TMDB. Qualquer registro
-- existente com type='ANIME' é dropado — base ainda sem usuários reais.

DELETE FROM "movies" WHERE "type" = 'ANIME';

-- Postgres não permite remover valor de enum diretamente: cria novo enum,
-- migra a coluna e dropa o antigo.
ALTER TYPE "MovieType" RENAME TO "MovieType_old";
CREATE TYPE "MovieType" AS ENUM ('MOVIE', 'SERIES');
ALTER TABLE "movies" ALTER COLUMN "type" TYPE "MovieType" USING "type"::text::"MovieType";
DROP TYPE "MovieType_old";
