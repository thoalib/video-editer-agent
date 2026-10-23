#!/bin/bash
# Scope: the supplied local bridge, Adobe CEP debug flag, and one Codex MCP entry.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/MCPBridgeCEP"
[ -f "$ROOT/vendor/premiere-pro-mcp/dist/index.js" ] || { echo 'Build the server first.'; exit 1; }
if [ -d "$DEST" ]; then
  BACKUP="$DEST.backup-$(date +%Y%m%d-%H%M%S)"
  cp -R "$DEST" "$BACKUP"
fi
mkdir -p "$DEST" /tmp/premiere-mcp-bridge
cp -R "$ROOT/vendor/premiere-pro-mcp/cep-plugin/." "$DEST/"
for v in 10 11 12; do defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1; done
codex mcp add premiere_pro --env PREMIERE_TEMP_DIR=/tmp/premiere-mcp-bridge --env PREMIERE_MCP_TELEMETRY=0 --env PREMIERE_MCP_UPDATE_CHECK=0 -- "$NODE" "$ROOT/vendor/premiere-pro-mcp/dist/index.js"
echo 'Installed. Restart Codex/Premiere, open Window > Extensions > MCP Bridge (CEP), and Start Bridge.'
