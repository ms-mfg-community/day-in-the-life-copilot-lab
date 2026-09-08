#!/usr/bin/env bash
set -euo pipefail
trap 'printf "prepared-core: dependency preparation failed at line %s\n" "$LINENO" >&2' ERR

runtime=/opt/lab
source=/build/source
mkdir -p "$runtime/fixtures/lab12"
cp labs/fixtures/lab12/sales.parquet "$runtime/fixtures/lab12/sales.parquet"
"$runtime/python/bin/python" -c 'import pandas as pd; import pyarrow; df=pd.read_parquet("labs/fixtures/lab12/sales.parquet"); assert list(df.columns)==["order_id","region","amount_usd","ts"]; assert len(df)==5'

pnpm -C node build
dotnet build dotnet/ContosoUniversity.sln --no-restore --nologo

export PLAYWRIGHT_BROWSERS_PATH="$runtime/browsers"
export PLAYWRIGHT_SKIP_BROWSER_GC=1
pnpm -C node exec playwright install chromium
dotnet_driver="$source/dotnet/ContosoUniversity.PlaywrightTests/bin/Debug/net8.0/.playwright"
"$dotnet_driver/node/linux-x64/node" "$dotnet_driver/package/cli.js" install chromium
cp "$dotnet_driver/package/browsers.json" "$runtime/dotnet-browsers.json"
node -e 'const {createRequire}=require("module"); const path=require("path"); const r=createRequire(require.resolve("./node/node_modules/@playwright/test")); const p=createRequire(r.resolve("playwright")); require("fs").copyFileSync(path.join(path.dirname(p.resolve("playwright-core/package.json")),"browsers.json"),"/opt/lab/node-browsers.json")'
node /opt/lab/core/verify/browser.mjs "$source"

find "$runtime/nuget-cache" -name '*.nupkg' -exec cp '{}' "$runtime/nuget-feed/" \;
node --input-type=module -e 'import {catalogDirectory} from "/opt/lab/core/runtime/catalog.mjs"; import {writeJson} from "/opt/lab/core/runtime/io.mjs"; for(const [name,path] of [["root","/build/source/node_modules"],["node","/build/source/node/node_modules"],["nuget","/opt/lab/nuget-cache"]]) writeJson(`/opt/lab/inventories/${name}.json`,catalogDirectory(path));'
tar -czf "$runtime/bundles/root.tar.gz" -C node_modules .
tar -czf "$runtime/bundles/node.tar.gz" -C node/node_modules .
tar -czf "$runtime/bundles/nuget.tar.gz" -C "$runtime/nuget-cache" .
# Attendee build output is deliberately absent: init regenerates restore
# assets at the real checkout path and exercises compile the editable source.
rm -r "$runtime/nuget-cache"
