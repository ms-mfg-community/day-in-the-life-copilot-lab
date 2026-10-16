declare module 'virtual:spa-content' {
  export const segments: ReadonlyArray<{
    id: string;
    minutes: number;
    labRefs: string[];
    scriptSource: string;
    title: string;
    html: string;
  }>;
}
