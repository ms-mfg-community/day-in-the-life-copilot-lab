declare module 'virtual:spa-content' {
  export const segments: ReadonlyArray<{
    id: string;
    minutes: number;
    labRefs: string[];
    scriptSource: string;
    title: string;
    html: string;
    /** The speaker script of the segment, rendered at build time through the same sanitising pipeline as `html`. */
    scriptHtml: string;
  }>;
}
