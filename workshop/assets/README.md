# workshop/assets/

Drop-in folder for binary assets referenced by `workshop/styles/theme.css` and
the Reveal.js deck. Files here are referenced by relative path from the
stylesheet (`../assets/...`).

## Expected files

The CSS theme references the paths below. **None of these files are committed
in the WS-C-theme-css wave** — they are dropped in by wave 2
(`wsC-build-pipeline`) or by a later asset-curation pass.

If a file is missing at deck-build time, the theme's fallback path keeps the
deck legible (system fonts + CSS wordmark in place of `logo.svg`).

| Path                                  | Purpose                                          | License            |
| ------------------------------------- | ------------------------------------------------ | ------------------ |
| `fonts/Inter-Regular.woff2`           | Body / heading font, weight 400.                  | SIL OFL 1.1        |
| `fonts/Inter-Bold.woff2`              | Body / heading font, weight 700.                  | SIL OFL 1.1        |
| `fonts/JetBrainsMono-Regular.woff2`   | Code font, weight 400.                            | SIL OFL 1.1        |
| `fonts/JetBrainsMono-Bold.woff2`      | Code font, weight 700.                            | SIL OFL 1.1        |
| `logo.svg`                            | Cover-slide logo slot (upper-left).               | See note below.    |

## Logo policy

We do **not** ship the GitHub or Copilot wordmark / Octocat marks unless we
have explicit rights to redistribute them with this workshop content. The
default path is therefore a **text wordmark** rendered in CSS — the theme
includes a `.cover-wordmark` element class that produces a uppercase Inter
wordmark on the cover gradient. Only replace with `logo.svg` when the rights
review is complete.

If `logo.svg` is added later it should be:
- A vector SVG (no rasterized fallbacks needed at workshop scale).
- Roughly 220×56 px in viewBox, white-on-transparent, so it reads against the
  Copilot-purple cover gradient.
- Single-color so the dark/light auto-switch on `[data-theme="dark"]` does not
  introduce a color clash.

## Font sourcing

Both fonts are SIL Open Font License 1.1. Recommended sources:

- **Inter** — <https://github.com/rsms/inter/releases> (download the
  `Inter-*.zip` archive, copy the `web/Inter-Regular.woff2` and
  `web/Inter-Bold.woff2` files into `fonts/`).
- **JetBrains Mono** — <https://github.com/JetBrains/JetBrainsMono/releases>
  (download `JetBrainsMono-*.zip`, copy the `webfonts/JetBrainsMono-Regular.woff2`
  and `webfonts/JetBrainsMono-Bold.woff2` files into `fonts/`).

Verify the OFL license file from each upstream is preserved alongside the
fonts (commit them to `fonts/OFL-Inter.txt` and `fonts/OFL-JetBrainsMono.txt`)
when the binaries land.

## Why `.gitkeep`?

Git does not track empty directories. The `.gitkeep` sentinel ensures
`workshop/assets/` exists in the working tree as soon as this branch is
checked out, so the build pipeline (wave 2) and the asset-curation step have
a stable destination to write into.
