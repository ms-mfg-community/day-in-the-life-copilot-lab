export interface DependencyCatalog {
  schemaVersion: number;
  entries: Array<{ path: string; kind: string; sha256?: string; target?: string; executable?: boolean }>;
}
export function catalogDirectory(root: string): DependencyCatalog;
export function verifyCatalog(root: string, catalog: DependencyCatalog): void;
