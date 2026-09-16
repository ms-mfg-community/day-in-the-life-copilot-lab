export function resolveInputs(source: string): {
  platform: string;
  images: Record<string, string>;
  tools: Record<string, string>;
};
export function archiveSource(repository: string, revision: string, destination: string): { commit: string; archiveSha256: string };
