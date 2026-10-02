#!/usr/bin/env bash
#
# create-epic.sh — create .specify/epics/<slug>/ and seed epic.md from the
# extension's epic-template.
#
# Usage: create-epic.sh <slug>
#
# Refuses to overwrite an existing epic. Exits non-zero on any failure so the
# calling command can stop rather than report a success it did not achieve.

set -euo pipefail

usage() {
    echo "Usage: $(basename "$0") <slug>" >&2
    echo "  <slug>  lowercase letters, digits and hyphens only" >&2
}

if [[ $# -ne 1 ]]; then
    usage
    exit 2
fi

SLUG="$1"

# Validate before touching the filesystem: the slug becomes a directory name.
if ! [[ "$SLUG" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]; then
    echo "ERROR: invalid slug '$SLUG' — use lowercase letters, digits and hyphens only." >&2
    exit 1
fi

# Resolve paths relative to this script, not to the caller's cwd:
#   <ext>/scripts/bash/create-epic.sh  ->  <ext>/templates/epic-template.md
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE="$EXT_ROOT/templates/epic-template.md"

if [[ ! -f "$TEMPLATE" ]]; then
    echo "ERROR: template not found at $TEMPLATE" >&2
    exit 1
fi

# The epic lives under the project's .specify/, which is the grandparent of the
# installed extension directory: .specify/extensions/<id>/ -> .specify/
SPECIFY_DIR="$(cd "$EXT_ROOT/../.." && pwd)"
EPIC_DIR="$SPECIFY_DIR/epics/$SLUG"
EPIC_FILE="$EPIC_DIR/epic.md"

if [[ -e "$EPIC_FILE" ]]; then
    echo "ERROR: epic already exists at $EPIC_FILE — choose another slug." >&2
    exit 1
fi

mkdir -p "$EPIC_DIR"
cp "$TEMPLATE" "$EPIC_FILE"

echo "EPIC_DIR: $EPIC_DIR"
echo "EPIC_FILE: $EPIC_FILE"
