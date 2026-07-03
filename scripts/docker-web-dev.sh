#!/bin/sh
set -e

# O node_modules vive num volume nomeado; sincronizamos as dependências no
# start para que mudanças no package.json (ex: novas fontes) sejam refletidas
# sem precisar recriar o volume manualmente.
echo ">> Sincronizando dependências..."
npm install --no-audit --no-fund

echo ">> Compilando @sindprf/types..."
npm run build -w packages/types

echo ">> Subindo Web (Vite)..."
exec npm run dev -w apps/web -- --host 0.0.0.0
