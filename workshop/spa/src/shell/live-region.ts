// The shell's polite live region. AC8, AC10 and the keyboard issues write state changes into it through `announce`.

export interface LiveRegionElement {
  textContent: string | null;
}

export type Announcer = (message: string) => void;

/**
 * Returns `announce`. A repeated message would not be re-read by a screen reader because the text does not change,
 * so the region is cleared first and the message is written on the next turn. Only the latest announcement is
 * written: a deferred write from an earlier call is dropped, so it can never land after a newer clear.
 */
export function createAnnouncer(
  region: LiveRegionElement,
  defer: (work: () => void) => void = (work) => void setTimeout(work, 50),
): Announcer {
  let latest = 0;
  return (message) => {
    const ticket = ++latest;
    region.textContent = '';
    defer(() => {
      if (ticket === latest) region.textContent = message;
    });
  };
}
