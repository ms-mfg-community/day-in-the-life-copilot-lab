// The shell's polite live region. AC8, AC10 and the keyboard issues write state changes into it through `announce`.

export interface LiveRegionElement {
  textContent: string | null;
}

export interface AnnounceOptions {
  /**
   * The message is owed to the reader, so what is announced after it does not take it back. AC8 asks for the end of fullscreen to be
   * written to the region and 2.5 for the failure of a request to be announced, and a timer that reaches its five-minute mark a few
   * milliseconds later must leave neither unsaid. It is written together with whatever else is announced before the write, as one
   * announcement, in the order they were announced. Only a later kept message replaces it. Held by `capture` like any other.
   */
  readonly keep?: boolean;
}

export interface Announcer {
  (message: string, options?: AnnounceOptions): void;
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
 * A kept message (`keep`) is the exception: it is written with the announcement that supersedes it, and is replaced only by
 * a later kept message, as an ordinary message is replaced only by a later ordinary one.
 */
export function createAnnouncer(
  region: LiveRegionElement,
  defer: (work: () => void) => void = (work) => void setTimeout(work, 50),
): Announcer {
  let latest = 0;
  let held: string[] | undefined;
  // What waits for the delay to be over, in the order it was announced: at most one message of each kind.
  let waiting: { message: string; keep: boolean }[] = [];
  const announce = (message: string, options?: AnnounceOptions): void => {
    if (held !== undefined) {
      held.push(message);
      return;
    }
    const ticket = ++latest;
    const keep = options?.keep === true;
    waiting = [...waiting.filter((one) => one.keep !== keep), { message, keep }];
    region.textContent = '';
    defer(() => {
      if (ticket !== latest) return;
      const text = waiting
        .map((one) => one.message)
        .filter((said) => said !== '')
        .join(' ');
      waiting = [];
      region.textContent = text;
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
