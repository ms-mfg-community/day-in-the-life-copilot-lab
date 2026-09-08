export interface Release {
  schemaVersion: 1;
  releaseId: string;
  source: { commit: string; archiveSha256: string };
  platform: { os: string; arch: string; nodeMajor: number; nodeAbi: string };
  inputs: Record<string, string>;
  scriptLineEndings?: Record<string, { original: string; linux: string }>;
  bundles: Array<{ name: string; target: string; archive: string; sha256: string; catalog: string; catalogSha256: string }>;
  requiredPaths: string[];
  capabilities: { included: string[]; excluded: string[] };
}

export interface WorkspaceContext {
  workspace: string;
  release: Release;
  state: { releaseId: string; workspaceId: string; status: string; completed: string[] };
}

export interface LocalServer {
  type: 'local';
  command: string;
  args: string[];
  tools: string[];
  env?: Record<string, string>;
}

export interface LanguageServer {
  command: string;
  args: string[];
  rootUri: string;
  fileExtensions: Record<string, string>;
}
