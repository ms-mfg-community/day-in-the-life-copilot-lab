# Authoring content for the Teaching SPA

The curriculum is written once, in `labs/*.md`, `workshop/slides/*.md` and
`workshop/speaker-scripts/*.md`. The Teaching SPA reads those files and keeps no copy of their
prose. `workshop/spa/content/` holds only what the curriculum cannot say: the order of the
segments, the interactions that exist, and the numbers behind a chart.

## Front-matter keys

This lists every top-level front-matter key that occurs in the three curriculum globs. `Occurs in`
names the glob: `slides` is `workshop/slides/*.md`, `speaker-scripts` is
`workshop/speaker-scripts/*.md` and `labs` is `labs/*.md`.

The table is generated. The `Key` and `Occurs in` cells are rewritten from the files by
`npm run spa:frontmatter-keys`; do not edit them by hand. `Meaning` is the one hand-written
column, and the command keeps what is already there.

<!-- spa:frontmatter-keys:begin -->
| Key | Occurs in | Meaning |
|---|---|---|
| anchor_labs | slides | The labs a module's slides anchor to, each written as a lab id: the lab's file name under `labs/` without `.md` (`lab05`, `lab-gh-extensions`). |
| lab_number | labs | A lab's place in the lab sequence: an integer for the numbered labs (`1` for `lab01`) or a short string for a lab outside the numbering (`gh-extensions`). Both forms occur in the curriculum, so the schema accepts both. |
| minutes | slides, speaker-scripts | Minutes a module is allotted when it is taught. The slide's value is the one a `deck.json` segment must equal (AC2); a speaker script carries its own copy. |
| module | slides, speaker-scripts | The module a file belongs to: `M1` to `M6`, plus `M5b` and `M5c`. |
| pace | labs | A lab's timing as a mapping: `presenter_minutes` for the quick in-lab fly-by and `self_paced_minutes` for solo completion. A `pace` missing either one is rejected. |
| phase | slides, speaker-scripts | The content phase (`3a`, `3b` or `3c`) in which a module's slides and script were written. The curriculum does not define it further. |
| prerequisites | labs | Lab ids that should be completed before this lab (`lab02`, `lab04`). Optional; only a lab that depends on earlier ones carries it. |
| registry | labs | Path of the shared registry file the labs draw pinned values and pace figures from. The value is `docs/_meta/registry.yaml` wherever it appears. |
| role | slides | Marks a slide file that is not a module. Only the cover slide uses it, with the value `cover`; the cover has no `module`, `minutes` or `phase`, so it cannot be a deck segment. |
| slide_source | speaker-scripts | Path from the repository root to the slide file a speaker script accompanies (`workshop/slides/10-module-1.md`). |
| title | slides, speaker-scripts, labs | The display title of the slide file, speaker script or lab. Any non-empty text. |
<!-- spa:frontmatter-keys:end -->

`workshop/spa/schema/frontmatter.schema.json` accepts these keys and no others
(`additionalProperties: false`), so `npm run spa:validate` rejects any file whose front matter
uses a key that is not in the table.

## When a lab adds, renames or drops a front-matter key

1. Run `npm run spa:frontmatter-keys`. The table is rewritten from the files. A new key gets a
   row with a placeholder Meaning, and the command lists the keys that still need one.
2. Replace the placeholder with what the key means.
3. Add the key to `workshop/spa/schema/frontmatter.schema.json` with its type, or remove it
   from there if the key is gone. For a key the schema does not accept yet, the command prints
   the value types it saw in the curriculum. The type is a decision, so this step is not
   generated: it is also what stops a mistyped key from being accepted without anyone noticing.
4. Run `npm run spa:validate` and `npx vitest run tests/spa`.

`npm run spa:frontmatter-keys -- --check` reports a stale table without writing, for use in a gate.

## What checks what

Three checks tie the document to both sides. They are separate on purpose; each one covers a gap
the other two leave open.

- `tests/spa/content-authoring-keys.test.ts` (AC24): the keys in the table equal the keys in the
  curriculum files.
- `tests/spa/frontmatter-schema-keys.test.ts` (AC25): the keys the schema accepts equal the keys
  in the table, and the schema is closed.
- `npm run spa:validate` (AC1): the schema accepts every real curriculum file, and rejects the
  fixtures under `tests/spa/fixtures/invalid/`.

## The content files

Each one is checked by `npm run spa:validate` against the schema of the same kind in
`workshop/spa/schema/`.

- `workshop/spa/content/deck.json` lists the segments in teaching order. A segment names its
  slide, its speaker script and its labs by path, and gives its `minutes`. It copies no prose,
  and `tests/spa/content-refs.test.ts` (AC2) checks that every path exists and that each
  segment's `minutes` equals the `minutes` in its slide's front matter.
- `workshop/spa/content/interactions.json` is the inventory of interactive components: an `id`,
  one of the nine `pattern` names, the `segment` it belongs to, its `label` and `keys`, and
  whether it has a `statusRegion`. A chart or diagram also names the `longDescriptionId` of its
  text alternative.
- `workshop/spa/content/datasets/*.json` is the data behind a chart: settable parameters and
  outputs that are sums of a constant and parameter terms, plus a `provenance` that says whether
  the numbers are illustrative, measured or derived. An interaction points at a dataset by `id`.

Run the validator over any path with `npm run spa:validate -- <path>`. With no path it checks
`workshop/spa/content/` and the three curriculum globs.
