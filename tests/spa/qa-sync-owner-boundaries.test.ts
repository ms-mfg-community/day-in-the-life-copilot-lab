// Independent SPA-07 F1 boundaries: a presenter name is not proof of the window
// that sent a claim, and a readable missing marker is not an unreadable opaque
// opener. The existing Lab supplies transport events; assertions inspect the
// mounted script and the effect of a later real presentation change.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHANNEL_NAME,
  LIVENESS_MS,
  PRESENTER_KEY,
  PROTOCOL,
  STORAGE_KEYS,
  VERSION,
  createPresenterSync,
  parseSyncConfig,
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

it('QA F1 recovery: reopening an opaque speaker after liveness loss follows its owner within 500 ms', async () => {
  // Arrange: the opaque opener reloads without a farewell. Its WindowProxy is
  // unchanged, but the old page no longer listens or answers liveness probes.
  const s = scene({
    at: 1,
    presenter: { opaque: true },
    options: { fail: ['broadcastchannel'], timeoutMs: 1000 },
  });
  s.lab.throwOnCrossOrigin = true;
  await drain();
  expect(s.attr('data-sync-state')).toBe('synchronized');
  s.lab.unload(s.presenterWin);
  const reloaded = createPresenterSync({
    window: s.presenterWin,
    config: parseSyncConfig('', { fail: ['broadcastchannel'] }),
    segmentIds: s.ids,
    presenterId: 'P-reloaded',
    snapshot: () => stateAt(s.ids, 2),
  });
  try {
    await vi.advanceTimersByTimeAsync(LIVENESS_MS + 1000);
    await drain();
    expect(s.attr('data-sync-state')).toBe('not-synchronized');
    expect(s.el('speaker-next').disabled).toBe(false);

    // Act: the user's Present control gives the new presenter the existing
    // named window. Its authenticated claim must work from degraded state too.
    reloaded.setPopup(s.handle);
    await drain();
    await vi.advanceTimersByTimeAsync(500);

    // Assert the actual script, not merely the receipt of a claim.
    expect({ index: s.index(), sync: s.attr('data-sync-state') }).toEqual({
      index: '2',
      sync: 'synchronized',
    });
  } finally {
    reloaded.dispose();
  }
});
