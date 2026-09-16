#!/usr/bin/env bash
set -euo pipefail
trap 'printf "prepared-core: dependency preparation failed at line %s\n" "$LINENO" >&2' ERR

runtime=/opt/lab
mkdir -p "$runtime/bundles" "$runtime/nuget-feed" "$runtime/nuget-cache" "$runtime/wheels"
npm ci --include=dev --no-audit --no-fund
pnpm -C node install --frozen-lockfile --store-dir "$runtime/pnpm-store"
node -e 'const Database=require("./node/node_modules/better-sqlite3"); const db=new Database(":memory:"); if(db.prepare("SELECT 42 AS value").get().value!==42) process.exit(1); db.close()'

python3 -m venv "$runtime/python"
"$runtime/python/bin/pip" download --only-binary=:all: --require-hashes \
  -r packaging/core/python/requirements.lock -d "$runtime/wheels"
"$runtime/python/bin/pip" install --no-index --find-links="$runtime/wheels" --require-hashes \
  -r packaging/core/python/requirements.lock

dotnet restore dotnet/ContosoUniversity.sln --locked-mode --packages "$runtime/nuget-cache" -p:NuGetAudit=false
while IFS=$'\t' read -r tool version; do
  dotnet tool install "$tool" --version "$version" --tool-path "$runtime/dotnet-tools"
done < <(jq -r '.dotnet_tools | to_entries[] | [.key,.value] | @tsv' /tmp/lab-inputs.json)
