-- Remove a preferência allowAdultContent do perfil.
-- O TMDB não classifica conteúdo de forma utilizável (`adult` cobre só hardcore
-- pornography, e /discover/tv nem suporta certification), então a toggle virou
-- código morto. Removida junto com o endpoint e a UI correspondentes.

ALTER TABLE "profiles" DROP COLUMN "allowAdultContent";
