export interface A11yTool {
  readonly tool: string;
  readonly version: string;
  readonly entry: string;
  readonly runOnly: { readonly type: 'tag'; readonly values: readonly string[] };
}
export const A11Y_TOOL: A11yTool;
export const AXE_SCRIPT: string;
