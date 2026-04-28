#!/bin/sh

echo "ðŸ”„ Verificando e executando migrations do Prisma..."

# Aguarda o banco estar pronto
echo "â³ Aguardando PostgreSQL estar pronto..."
sleep 3

# Se existir pasta de migrations, aplica elas
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
  echo "ðŸ“¦ Aplicando migrations existentes..."
  npx prisma migrate deploy
else
  echo "ðŸ“ Criando schema inicial no banco de dados..."
  # Usa db push para criar o schema diretamente (melhor para desenvolvimento)
  # Tenta push normal primeiro, se falhar tenta com force-reset
  npx prisma db push --accept-data-loss || npx prisma db push --force-reset --accept-data-loss || true
fi

echo "âœ… Banco de dados pronto!"

echo "ðŸŒ± Executando seed..."
node prisma/seed.js

echo "ðŸš€ Iniciando servidor..."

# Inicia o servidor
exec npm run dev

