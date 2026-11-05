#!/usr/bin/env bash
# Roda no deploy do Render, depois que as dependências já foram instaladas.
# No painel do serviço, use este arquivo como Pre-Deploy Command:
#   bash scripts/deploy.sh
# Se o plano não mostrar Pre-Deploy, acrescente o mesmo comando ao final do Build Command.

set -euo pipefail

cd "$(dirname "$0")/.."

python manage.py migrate --noinput
python manage.py criar_superusuario
