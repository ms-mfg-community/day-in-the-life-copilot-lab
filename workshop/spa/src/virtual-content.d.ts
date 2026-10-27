declare module 'virtual:spa-content' {
  export const segments: ReadonlyArray<{
    id: string;
    minutes: number;
    labRefs: string[];
    scriptSource: string;
    title: string;
    /** The front matter's module code (M1, M5b), when the slide carries one. */
    module?: string;
    /** The slide's h2 sections, in order, by the ids the sanitizer gave them. A test's hand-made segment may leave it out. */
    sections?: ReadonlyArray<{ id: string; title: string }>;
    /** The curriculum's "advanced outcome" for the module, sanitized HTML, when the curriculum has one. */
    outcomeHtml?: string;
    html: string;
    /** The speaker script of the segment, rendered at build time through the same sanitising pipeline as `html`. */
    scriptHtml: string;
  }>;
}
