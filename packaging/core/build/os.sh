#!/usr/bin/env bash
set -euo pipefail
trap 'printf "prepared-core: OS preparation failed at line %s\n" "$LINENO" >&2' ERR

snapshot="$(node -p 'JSON.parse(require("fs").readFileSync("/tmp/lab-inputs.json")).debian_snapshot')"
test "$(dpkg --print-architecture)" = amd64
rm /etc/apt/sources.list.d/debian.sources
printf 'deb [check-valid-until=no] https://snapshot.debian.org/archive/debian/%s bookworm main\n' "$snapshot" > /etc/apt/sources.list
printf 'deb [check-valid-until=no] https://snapshot.debian.org/archive/debian-security/%s bookworm-security main\n' "$snapshot" >> /etc/apt/sources.list
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  bash ca-certificates curl git jq make tmux tar unzip xz-utils \
  build-essential pkg-config python3 python3-venv python3-pip shellcheck \
  libicu72 libssl3 zlib1g libsqlite3-0

gh_version="$(node -p 'JSON.parse(require("fs").readFileSync("/tmp/lab-inputs.json")).gh.version')"
gh_sha="$(node -p 'JSON.parse(require("fs").readFileSync("/tmp/lab-inputs.json")).gh.sha256')"
aw_version="$(node -p 'JSON.parse(require("fs").readFileSync("/tmp/lab-inputs.json")).gh_aw_version')"
aw_sha="$(node -p 'JSON.parse(require("fs").readFileSync("/tmp/lab-inputs.json")).gh_aw_sha256')"
mkdir -p /opt/lab/gh /opt/lab/gh-aw /opt/lab/notices
curl --fail --location --silent --show-error \
  "https://github.com/cli/cli/releases/download/v${gh_version}/gh_${gh_version}_linux_amd64.tar.gz" -o /tmp/gh.tar.gz
printf '%s  /tmp/gh.tar.gz\n' "$gh_sha" | sha256sum --check -
tar -xzf /tmp/gh.tar.gz --strip-components=1 -C /opt/lab/gh
ln -s /opt/lab/gh/bin/gh /usr/local/bin/gh
curl --fail --location --silent --show-error \
  "https://github.com/github/gh-aw/releases/download/v${aw_version}/linux-amd64" -o /opt/lab/gh-aw/gh-aw
printf '%s  /opt/lab/gh-aw/gh-aw\n' "$aw_sha" | sha256sum --check -
chmod 755 /opt/lab/gh-aw/gh-aw
curl --fail --location --silent --show-error \
  "https://raw.githubusercontent.com/github/gh-aw/v${aw_version}/LICENSE" -o /opt/lab/notices/gh-aw-LICENSE
rm /tmp/gh.tar.gz
