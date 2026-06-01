#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./serve.sh              # serve on 0.0.0.0:8000
#   ./serve.sh 8080         # serve on 0.0.0.0:8080
#   ./serve.sh 8080 127.0.0.1

PORT="${1:-8000}"
HOST="${2:-0.0.0.0}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SITE_DIR="${ROOT_DIR}/dist"
if [ ! -d "${SITE_DIR}" ]; then
  echo "dist/ was not found."
  echo "Run \`npm run build\` before \`./serve.sh\`."
  exit 1
fi

cd "${SITE_DIR}"

exec python3 - <<PY
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

host = "${HOST}"
port = int("${PORT}")

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

server = ThreadingHTTPServer((host, port), NoCacheHandler)
print(f"Serving on http://{host}:{port}/")
print("Press Ctrl+C to stop.")
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nStopped.")
finally:
    server.server_close()
PY
