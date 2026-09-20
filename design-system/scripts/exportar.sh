#!/usr/bin/env bash
# Exporta um modelo vivo (HTML 1280×720) para PNG usando um Chromium headless.
# Uso: design-system/scripts/exportar.sh components/Thumbnail-Tutorial.html thumbnails/out/solver.png [escala]
#   escala: fator de resolução (padrão 1 → 1280×720; 2 → 2560×1440, boa para o YouTube).
# Procura Chrome, Chromium ou Edge; ou defina CHROME=/caminho/do/binário.
set -euo pipefail

html="${1:?informe o HTML de entrada}"
png="${2:?informe o PNG de saída}"
escala="${3:-1}"

candidatos=(
  "${CHROME:-}"
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
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
  --window-size=1280,720 --force-device-scale-factor="$escala" \
  --screenshot="$abs_png" "file://$abs_html" 2>/dev/null

echo "$png"
