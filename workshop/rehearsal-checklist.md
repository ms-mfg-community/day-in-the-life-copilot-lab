# Rehearsal Checklist — Advanced Copilot CLI Workshop

> Dry-run checklist for the presenter. Walk this end-to-end the day
> before (or morning of) the live session. Pair with
> [`workshop/timing-plan.md`](./timing-plan.md) and
> [`workshop/facilitator-guide.md`](./facilitator-guide.md).
>
> **Gate:** every item in `## Tech check` must be GREEN before you
> start module rehearsal. If a tech-check item fails, fix or activate
> the matching entry in `## Backup-plan triggers` before proceeding.

## Tech check

- [ ] `scripts/preflight.sh` (or `scripts/preflight.ps1` on Windows) exits 0 on the presenter laptop
- [ ] `copilot --help` prints and `copilot auth status` shows an authenticated session
- [ ] `gh auth status` GREEN; `gh --version` ≥ the pinned version in `docs/_meta/registry.yaml`
- [ ] Container runtime running (Docker Desktop / Podman / Rancher) — required for Labs 05 + 12 demos
- [ ] `make slides` builds cleanly into `workshop/dist/` and opens in the browser you will project from
- [ ] Screen-share target verified (display mirroring resolution, no private notifications surfaced)
- [ ] Microphone + webcam + recording path (if session is recorded) confirmed with captions enabled — see [`workshop/a11y-notes.md`](./a11y-notes.md)

## Room check

- [ ] Projector / large display shows slides at a distance-readable font size (walk to the back row)
- [ ] HDMI / USB-C / wireless cast adapter present **and** a spare
- [ ] Power: laptop charger reaches the podium; venue power outlets verified live
- [ ] Wi-Fi on the presenter SSID reaches Copilot CLI, GitHub, Azure, and Microsoft Learn (test each)
- [ ] Wired backup network (hotspot / tether) ready if Wi-Fi drops
- [ ] Room lights dimmable enough to see slides without washing out code contrast
- [ ] Water + timer + printed copy of [`workshop/timing-plan.md`](./timing-plan.md) on the podium

## Slide-advance rehearsal

- [ ] Deck advances forward and backward with keyboard arrows and the clicker (if using one)
- [ ] Clicker batteries fresh; spare batteries on hand
- [ ] All code blocks remain on-screen without overflow clipping on the projector resolution
- [ ] Speaker-view / presenter-notes surface only on the presenter display, not the projected display
- [ ] Internal slide links (to anchor labs and between modules) resolve when clicked from the built HTML
- [ ] Every embedded image has a visible alt text / caption per [`workshop/a11y-notes.md`](./a11y-notes.md)

## Demo commands rehearsed

Run each live demo command end-to-end at least once on the presenter
laptop within the last 24 hours. Cross-check against the per-module
speaker scripts in `workshop/speaker-scripts/`.

- [ ] **M1** — extensibility architecture walk (`copilot --help`, skill invocation, hook trigger)
- [ ] **M2** — multi-server MCP compose (`copilot --additional-mcp-config @mcp-configs/copilot-cli/individual/{context7,microsoft-learn,memory}.json`, `/mcp`, Fabric MCP round-trip)
- [ ] **M3** — multi-agent parallel dispatch (sub-agent fan-out, budget summary)
- [ ] **M4** — gh-aw authoring + `gh aw compile` + one run trigger
- [ ] **M5** — plugin marketplace install + `/plugins` list
- [ ] **M6** — A2A/ACP handshake + tmux-orchestrator meta-loop start
- [ ] Each demo's expected output recorded mentally (or in speaker-notes) so deviation is obvious live

## Backup-plan triggers

Pre-decide when to abandon a live demo. If any trigger fires, pivot
immediately to the matching fallback in
[`workshop/fallback-screenshots/`](./fallback-screenshots/) and keep moving.

- [ ] **Trigger: Wi-Fi drops mid-demo** → switch to wired/hotspot; if still broken within 60 s, show the fallback screenshot for the current module
- [ ] **Trigger: Copilot CLI auth expired on stage** → skip re-auth, show the fallback screenshot and narrate the expected flow
- [ ] **Trigger: container runtime won't start (M2)** → show M2 fallback; defer live multi-server compose to the break
- [ ] **Trigger: parallel-dispatch demo (M3) hangs > 90 s** → cancel, show M3 fallback, talk through budget recovery
- [ ] **Trigger: gh-aw run (M4) blocked on approvals / rate limit** → show M4 fallback; narrate the permissions decision
- [ ] **Trigger: tmux-orchestrator (M6) loops diverge** → show M6 fallback screenshot sequence; retain 3 min of Q&A buffer
- [ ] **Trigger: running > 5 min long at M4 boundary** → drop the module flagged "drop-first" in `workshop/timing-plan.md`

## Post-rehearsal retro

- [ ] Actual clock captured per module (write into a scratch copy of the timing plan)
- [ ] Any demo that was slower than the speaker-script estimate flagged with a shorter live path or earmarked for fallback
- [ ] Any new pitfall recorded back into the relevant module speaker script before the live session
