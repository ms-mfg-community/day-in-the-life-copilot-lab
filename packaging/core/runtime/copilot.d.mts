export function prepareUserTools(context: { workspace: string; state: { workspaceId: string } }, runtime: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export function copilotArguments(context: { workspace: string }, runtime: string, env: NodeJS.ProcessEnv, args: string[]): string[];
