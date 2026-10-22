// Independent SPA-07 F1 boundaries: a presenter name is not proof of the window
// that sent a claim, and a readable missing marker is not an unreadable opaque
// opener. The existing Lab supplies transport events; assertions inspect the
// mounted script and the effect of a later real presentation change.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHANNEL_NAME,
  PRESENTER_KEY,
  PROTOCOL,
  STORAGE_KEYS,
  VERSION,
  type TransportName,
} from '../../workshop/spa/src/shell/sync';
import { disposeScenes, scene, stateAt } from './helpers/speaker-rig';
import { drain } from './helpers/sync-doubles';

const FAIL_BEFORE: Record<TransportName, TransportName[]> = {
  broadcastchannel: [],
  postmessage: ['broadcastchannel'],
  storage: ['broadcastchannel', 'postmessage'],
};
const claim = (presenter: string, state: unknown) => ({
  app: PROTOCOL,
  v: VERSION,
  from: 'presenter',
  type: 'claim',
  presenter,
  seq: Number.MAX_SAFE_INTEGER,
  state,
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  disposeScenes();
  vi.useRealTimers();
});

describe('QA F1: a foreign claim cannot borrow the current owner name', () => {
  it.each(['broadcastchannel', 'postmessage', 'storage'] as const)(
    'ignores the foreign %s claim and still applies the real owner next update',
    async (via) => {
      // Arrange: a real paired speaker, plus a window that is not its opener.
      const s = scene({ at: 1, options: { fail: FAIL_BEFORE[via] } });
      await drain();
      expect(s.attr('data-sync-transport')).toBe(via);
      const foreign = s.lab.window('not-the-opener');
      const forged = claim(String(Reflect.get(s.presenterWin, PRESENTER_KEY)), stateAt(s.ids, 2));

      // Act: use the real transport of the foreign window, with the right name
      // and a high counter. The sender's identity, not its spelling, is wrong.
      if (via === 'broadcastchannel') {
        const channel = new foreign.BroadcastChannel!(CHANNEL_NAME);
        channel.postMessage(forged);
        channel.close();
      } else if (via === 'storage') {
        foreign.localStorage!.setItem(STORAGE_KEYS.toSpeaker, JSON.stringify(forged));
      } else {
        s.lab.proxy(foreign, s.speakerWin).postMessage(forged, 'https://spa.test');
      }
      await drain();
      const afterClaim = s.index();
      await s.show(stateAt(s.ids, 0));

      // Assert effects, including that the hostile counter did not poison
      // monotonic filtering of the following genuine presentation update.
      expect({ afterClaim, afterOwnerMove: s.index(), sync: s.attr('data-sync-state') }).toEqual({
        afterClaim: '1',
        afterOwnerMove: '0',
        sync: 'synchronized',
      });
    },
  );
});

it('QA F1: a readable opener with no presenter marker is not an opaque unidentified presenter', async () => {
  const s = scene({ at: 1, options: { fail: ['broadcastchannel'] } });
  await drain();
  // The opener still exists, but its presentation marker is gone (a page that
  // left without a bye). A same-origin read succeeds and yields undefined.
  Reflect.deleteProperty(s.presenterWin, PRESENTER_KEY);
  const forged = claim('not-a-presentation-on-this-window', stateAt(s.ids, 2));
  s.lab.proxy(s.presenterWin, s.speakerWin).postMessage(forged, 'https://spa.test');
  await drain();
  await vi.advanceTimersByTimeAsync(500);
  expect({
    index: s.index(),
    sync: s.attr('data-sync-state'),
    nextDisabled: s.el('speaker-next').disabled,
    reportedLoss: s.announced.some((one) => one.keep && /not synchronized/i.test(one.message)),
  }).toEqual({ index: '1', sync: 'not-synchronized', nextDisabled: false, reportedLoss: true });
});
