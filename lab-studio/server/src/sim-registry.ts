import {
  fileExists,
  readWorkspaceFile,
  writeWorkspaceFile,
} from "./sandbox.js";

/**
 * Simulated plugin marketplace. Real `copilot plugin …` commands talk to GitHub
 * over the network; the studio answers from this local catalog instead so the
 * lab works offline and never touches a remote.
 */
export interface MarketplacePlugin {
  name: string;
  marketplace: string;
  version: string;
  description: string;
  components: string;
}

export const MARKETPLACES = [
  {
    name: "awesome-copilot",
    url: "github/awesome-copilot",
    description: "Community catalog of Copilot CLI plugins (built in)",
  },
];

export const CATALOG: MarketplacePlugin[] = [
  {
    name: "awesome-copilot",
    marketplace: "awesome-copilot",
    version: "2.4.0",
    description:
      "Starter pack: code-review agent, conventional-commit skill, changelog prompt",
    components: "2 agents · 3 skills · 1 MCP server",
  },
  {
    name: "dotnet-essentials",
    marketplace: "awesome-copilot",
    version: "1.8.2",
    description:
      ".NET agents and skills: EF Core migration helper, xUnit scaffolding, analyzer triage",
    components: "3 agents · 4 skills",
  },
  {
    name: "testing-toolkit",
    marketplace: "awesome-copilot",
    version: "3.1.0",
    description:
      "Test generation across xUnit, Vitest and Playwright with coverage-gap analysis",
    components: "1 agent · 5 skills",
  },
  {
    name: "db-migrator",
    marketplace: "awesome-copilot",
    version: "0.9.4",
    description:
      "Database schema diffing and migration planning for SQL Server and PostgreSQL",
    components: "1 agent · 2 skills · 1 MCP server",
  },
];

const STATE_PATH = ".sim/plugins.json";

export function installedPlugins(): MarketplacePlugin[] {
  if (!fileExists(STATE_PATH)) return [];
  try {
    return JSON.parse(readWorkspaceFile(STATE_PATH)) as MarketplacePlugin[];
  } catch {
    return [];
  }
}

/** Install a plugin from a local workspace directory (Lab 11's my-plugin). */
export function installLocalPlugin(relDir: string): {
  ok: boolean;
  message: string;
} {
  const dir = relDir.replace(/^\.\//, "").replace(/\/$/, "");
  const manifestPath = `${dir}/manifest.yaml`;
  if (!fileExists(manifestPath)) {
    return {
      ok: false,
      message: `${manifestPath} not found — a plugin directory needs a manifest.`,
    };
  }
  const manifest = readWorkspaceFile(manifestPath);
  const name =
    /^name:\s*["']?([\w-]+)/m.exec(manifest)?.[1] ??
    dir.split("/").pop() ??
    "plugin";
  const version = /^version:\s*["']?([\d.]+)/m.exec(manifest)?.[1] ?? "0.0.0";
  const installed = installedPlugins();
  const plugin: MarketplacePlugin = {
    name,
    marketplace: `local:${dir}`,
    version,
    description: /^description:\s*["']?([^"'\n]+)/m.exec(manifest)?.[1] ?? "",
    components: `bundled from ${dir}/`,
  };
  const existing = installed.findIndex((p) => p.name === name);
  if (existing >= 0) installed[existing] = plugin;
  else installed.push(plugin);
  writeWorkspaceFile(STATE_PATH, JSON.stringify(installed, null, 2));
  return {
    ok: true,
    message: `Installed ${name} v${version} from ${dir}/ (local source)`,
  };
}

export function installPlugin(spec: string): {
  ok: boolean;
  message: string;
  plugin?: MarketplacePlugin;
} {
  // Accept "name", "name@marketplace", or "owner/repo".
  const [rawName] = spec.split("@");
  const name = (rawName ?? spec).includes("/")
    ? (spec.split("/")[1] ?? spec)
    : (rawName ?? spec);
  const plugin = CATALOG.find((p) => p.name === name);
  if (!plugin) {
    return {
      ok: false,
      message: `Plugin '${spec}' not found in any registered marketplace. Try: copilot plugin marketplace browse awesome-copilot`,
    };
  }
  const installed = installedPlugins();
  if (!installed.some((p) => p.name === plugin.name)) {
    installed.push(plugin);
    writeWorkspaceFile(STATE_PATH, JSON.stringify(installed, null, 2));
  }
  return {
    ok: true,
    message: `Installed ${plugin.name}@${plugin.marketplace} v${plugin.version}`,
    plugin,
  };
}
