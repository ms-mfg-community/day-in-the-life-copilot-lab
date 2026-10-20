// The shell's polite live region. AC8, AC10 and the keyboard issues write state changes into it through `announce`.

export interface LiveRegionElement {
  textContent: string | null;
}

export interface Announcer {
  (message: string): void;
  /**
   * Runs `work` and returns what it announced, in order, instead of announcing it. Nothing is cleared or written meanwhile, so what
   * was announced before `work` is not taken back by it. What to do with the messages, and when, is the caller's to decide.
   * Optional: an announcer that is a plain function (a test's) holds nothing, and its callers do without.
   */
  capture?(work: () => void): string[];
}

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
  let held: string[] | undefined;
  const announce = (message: string): void => {
    if (held !== undefined) {
      held.push(message);
      return;
    }
    const ticket = ++latest;
    region.textContent = '';
    defer(() => {
      if (ticket === latest) region.textContent = message;
    });
  };
  announce.capture = (work: () => void): string[] => {
    const outer = held;
    const kept: string[] = [];
    held = kept;
    try {
      work();
    } finally {
      held = outer;
    }
    return kept;
  };
  return announce;
}
