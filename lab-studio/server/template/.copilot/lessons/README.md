# The Lessons Wiki

Cross-session memory for this workspace, in plain markdown the agent writes
to itself. Three files matter:

| File         | Role                                                       |
| ------------ | ---------------------------------------------------------- |
| `index.md`   | Hand-curated catalog of promoted lessons, grouped by topic |
| `log.md`     | Dated, append-only journal of newly learned lessons        |
| `<topic>.md` | One file per durable lesson, with front-matter             |

The shape is enforced by `.github/instructions/lessons.instructions.md` —
its `applyTo` glob targets this directory, so Copilot applies that schema
whenever it edits files here. Promotion (log → topic file → index) is done
by the `consolidate-lessons` skill, never by hand.
