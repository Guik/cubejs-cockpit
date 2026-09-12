#!/usr/bin/env bash
# Build the dashboard's Docker image and load it into the local docker
# daemon. Not pulled from a registry -- self-hosted, this is the only way
# the image gets built. Cross-compiles for linux/amd64 regardless of the
# build machine's architecture (Encore's own build pipeline handles that;
# the app avoids any native-addon dependency -- node:sqlite instead of
# better-sqlite3 -- specifically so this cross-compile stays reliable).
#
# Run on whatever machine has Docker; the resulting image then needs
# loading onto the host that will actually run it, e.g.:
#   docker save cubejs-cockpit:latest | gzip | ssh host 'gunzip | docker load'
# and finally brought up by that host's docker-compose stack (which lives
# in the Cube deployment repo, not here).
#
#   ./scripts/build.sh
#   ./scripts/build.sh cubejs-cockpit:2026-09-04   # custom tag

set -euo pipefail

TAG="${1:-cubejs-cockpit:latest}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

command -v encore >/dev/null || {
  echo "encore CLI not found. Install: curl -L https://encore.dev/install.sh | bash" >&2
  exit 1
}

(cd "$DIR" && encore build docker "$TAG")

echo "Built $TAG -- load it on the deployment host and run: docker compose up -d cubejs_cockpit"
