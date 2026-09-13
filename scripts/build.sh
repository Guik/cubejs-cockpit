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

# Bakes a version string into the image the same way CI does (see
# shared/version.ts and docker.yml's "Resolve app version" step), so a
# locally-built image is self-describing too. Restored on exit -- this is
# a build-time patch, not something meant to show up as a real diff.
VERSION_FILE="$DIR/shared/version.ts"
VERSION="$(git -C "$DIR" describe --tags --always --dirty 2>/dev/null || echo dev)"
trap 'git -C "$DIR" checkout -- "$VERSION_FILE" 2>/dev/null || true' EXIT
sed -i.bak "s/APP_VERSION = \".*\"/APP_VERSION = \"$VERSION\"/" "$VERSION_FILE"
rm -f "$VERSION_FILE.bak"

(cd "$DIR" && encore build docker "$TAG")

echo "Built $TAG -- load it on the deployment host and run: docker compose up -d cubejs_cockpit"
