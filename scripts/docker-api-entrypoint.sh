#!/bin/sh
set -e

echo ">> Aplicando migrations (Prisma)..."
npx prisma migrate deploy

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo ">> Rodando seed..."
  npx prisma db seed
fi

echo ">> Subindo API..."
exec node dist/main.js
