#!/usr/bin/env bash
# Exporta um modelo vivo (HTML) para PNG usando um Chromium headless.
# Uso: design-system/scripts/exportar.sh entrada.html saida.png [escala] [largura] [altura]
#   escala: fator de resolução (padrão 1; 2 → dobra, boa para o YouTube).
#   largura/altura: tamanho da página em px (padrão 1280×720 = miniatura; 1080×1350 = feed do Instagram; 1080×1920 = story).
# Procura Chrome, Chromium ou Edge; ou defina CHROME=/caminho/do/binário.
set -euo pipefail

html="${1:?informe o HTML de entrada}"
png="${2:?informe o PNG de saída}"
escala="${3:-1}"
largura="${4:-1280}"
altura="${5:-720}"

candidatos=(
  "${CHROME:-}"
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  "/c/Program Files/Google/Chrome/Application/chrome.exe"
  "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  "/c/Program Files/Microsoft/Edge/Application/msedge.exe"
  "${LOCALAPPDATA:-}/Google/Chrome/Application/chrome.exe"
  "$(command -v google-chrome || true)"
  "$(command -v chromium || true)"
  "$(command -v microsoft-edge || true)"
)
bin=""
for c in "${candidatos[@]}"; do
  [[ -n "$c" && -x "$c" ]] && { bin="$c"; break; }
done
[[ -n "$bin" ]] || { echo "nenhum Chrome/Chromium/Edge encontrado; defina CHROME=" >&2; exit 1; }

mkdir -p "$(dirname "$png")"
abs_html="$(cd "$(dirname "$html")" && pwd)/$(basename "$html")"
abs_png="$(cd "$(dirname "$png")" && pwd)/$(basename "$png")"

"$bin" --headless=new --disable-gpu --hide-scrollbars \
  --window-size="$largura,$altura" --force-device-scale-factor="$escala" \
  --screenshot="$abs_png" "file://$abs_html" 2>/dev/null

echo "$png"
