# Target size exceptions (SC 2.5.8)

Every interactive element of the Teaching SPA is at least 24 × 24 CSS pixels
([spec 005](../../../specs/005-teaching-spa.md), section 2.11, AC17; `workshop/spa/src/styles.css`),
except the targets below, each of which relies on one of the five exceptions of
[SC 2.5.8 Target Size (Minimum)](https://www.w3.org/TR/WCAG22/#target-size-minimum): Spacing,
Equivalent, Inline, User agent control, Essential.

`tests/spa/a11y-browser-check.mjs` measures every visible interactive element in every route and
every opened state. A target under 24 × 24 that matches no `Selector` of this table fails the
gate; one that does is reported with the exception it relies on. A row here is a claim, and the
`Why` column is its justification.

| Selector | Exception | Why |
|---|---|---|
| `#main a[href]` | Inline | Every link inside a segment is in the slide's own text: a sentence, a list item, a table cell or a heading written in the curriculum's Markdown, rendered by the content pipeline. Its height is the line height of the text around it, which SC 2.5.8 exempts ("the target is in a sentence, or its size is otherwise constrained by the line-height of non-target text"). The segment navigation, which is the application's own, sits outside `#main` and is sized. |
| `#speaker-script a[href]` | Inline | The same, for a link inside the speaker script's text on the `#/script` surface. |
