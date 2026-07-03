#!/bin/sh
set -e

echo ">> Compilando @sindprf/types..."
npm run build -w packages/types

echo ">> Preparando banco (Prisma)..."
cd apps/api
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
cd ../..

echo ">> Subindo API (NestJS watch)..."
exec npm run dev -w apps/api
