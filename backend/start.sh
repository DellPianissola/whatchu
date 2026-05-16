#!/bin/sh
set -e

echo "[start] Aguardando PostgreSQL em $PGHOST:$PGPORT..."
PGHOST=${PGHOST:-postgres}
PGPORT=${PGPORT:-5432}

# Espera ativa em vez de sleep fixo
until nc -z "$PGHOST" "$PGPORT" 2>/dev/null; do
  sleep 1
done

echo "[start] Banco respondendo. Gerando Prisma Client..."

# Em dev, o volume node_modules persiste e o generate do Dockerfile fica obsoleto
# quando o schema muda. Regenerar no boot garante consistência entre schema atual
# e client em runtime — custo de ~1-2s, evita P2022 ("column X does not exist").
npx prisma generate

echo "[start] Aplicando migrations..."

if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  echo "[start] Sem migrations — usando db push (criação inicial)"
  npx prisma db push --accept-data-loss
fi

echo "[start] Rodando seed (idempotente)..."
node prisma/seed.js || echo "[start] Seed falhou ou foi pulado"

# Em dev usa node --watch (hot reload). Em prod, exec direto.
if [ "$NODE_ENV" = "production" ]; then
  echo "[start] Iniciando servidor em modo produção..."
  exec node server.js
else
  echo "[start] Iniciando servidor em modo desenvolvimento (watch)..."
  exec node --watch server.js
fi
