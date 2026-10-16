// The shell's polite live region. AC8, AC10 and the keyboard issues write state changes into it through `announce`.

export interface LiveRegionElement {
  textContent: string | null;
}

export type Announcer = (message: string) => void;

/**
 * Returns `announce`. A repeated message would not be re-read by a screen reader because the text does not change,
 * so the region is cleared first and the message is written on the next turn.
 */
export function createAnnouncer(
  region: LiveRegionElement,
  defer: (work: () => void) => void = (work) => void setTimeout(work, 50),
): Announcer {
  return (message) => {
    region.textContent = '';
    defer(() => {
      region.textContent = message;
    });
  };
}
