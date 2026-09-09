# Figma token inventory

- **Date:** 2026-09-09
- **Source:** `.figma/manifest.json` → `sources.weave` (`CAZybLope1cikvLyECBQnD`)
- **Method:** Live read via the write bridge (`use_figma`, Plugin API), calling
  `figma.variables.getLocalVariableCollectionsAsync()` and `getLocalVariablesAsync()` directly —
  **every** local variable and collection, not a sample. Alias values (`VARIABLE_ALIAS`) were
  resolved recursively to their final literal. This differs from the read-bridge's per-node
  `get_variable_defs`, which can only union what a caller happens to sample; this method has no
  coverage gap to disclose. Not covered: text styles, effect styles, paint styles, pages, and
  components — out of scope for this report, and already inventoried (as of 2026-08-28) in
  `.claude/skills/ds-figma-component/references/figma-file.md`.

## What is there (measured)

### The file has drifted from its last recorded snapshot

|                 | Last recorded (2026-08-28) | Measured now (2026-09-09) |
| --------------- | -------------------------- | ------------------------- |
| Collections     | 5                          | **6**                     |
| Total variables | 87                         | **154**                   |

The extra collection is **`Opacity Primitives`** (11 variables) — present in the Figma file, but
absent from `.figma/manifest.json` and `figma-file.md` **at the time of this read**. `Color
Primitives` had also grown substantially (full `red` and `green` ramps present; the prior `observed`
sample in the manifest named neither). At that point every document in this repo referencing "87
variables" was describing a file that no longer existed in that shape.

**Since fixed.** `.figma/manifest.json` was corrected in `3fcd1e2` and now records 154 variables in
6 collections, `Opacity Primitives` included. `figma-file.md` was given an explicit
superseded-for-variables notice pointing back here. This report is left in the past tense
deliberately — it is the record of what the drift was, not a live status check; re-run the read
above before trusting either file's current count without looking.

### The six collections, measured

| Collection           | Mode(s)   | Variables | Types         | Tier                                   |
| -------------------- | --------- | --------- | ------------- | -------------------------------------- |
| `Color Primitives`   | `Mode 1`  | 71        | COLOR         | primitive                              |
| `Color Tokens`       | `Mode 1`  | 15        | COLOR         | token (aliases into primitives)        |
| `Type Primitives`    | `Default` | 10        | FLOAT, STRING | primitive                              |
| `Type Tokens`        | `Mode 1`  | 24        | STRING, FLOAT | token (aliases into primitives)        |
| `Spacing Tokens`     | `Mode 1`  | 23        | FLOAT         | token (literals, not aliased)          |
| `Opacity Primitives` | `Mode 1`  | 11        | FLOAT         | primitive — **undocumented until now** |

All six collections still have exactly one mode. No light/dark axis exists anywhere in the file.

### Color Tokens — full list, resolved

| Variable                 | Resolves to | Aliases               | codeSyntax.WEB                    |
| ------------------------ | ----------- | --------------------- | --------------------------------- |
| `border/primary`         | `#363636`   | `color/gray/700`      | `weave-ds-border-primary`         |
| `brand/hover`            | `#401aca`   | `color/purple/600`    | `weave-ds-brand-hover`            |
| `brand/primary`          | `#5146e6`   | `color/purple/500`    | `weave-ds-brand-primary`          |
| `control/off`            | `#ef1313`   | `color/red/500`       | `weave-ds-control-off`            |
| `control/waveform`       | `#26e589`   | `color/green/300`     | `weave-ds-control-waveform`       |
| `interactive/hover`      | `#111111`   | `color/gray/900`      | `weave-ds-interactive-hover`      |
| `interactive/selectedBg` | `#5146e666` | `color/purple/500-40` | `weave-ds-interactive-selectedbg` |
| `surface/ghost`          | `#111111`   | `color/gray/900`      | `weave-ds-surface-ghost`          |
| `surface/overlay`        | `#111111`   | `color/gray/900`      | `weave-ds-surface-overlay`        |
| `surface/primary`        | `#1e1e1ee5` | `color/gray/800-90`   | `weave-ds-surface-primary`        |
| `surface/subtle`         | `#ffffff`   | `color/base/white`    | `weave-ds-surface-subtle`         |
| `text/disabled`          | `#ffffff`   | `color/base/white`    | `weave-ds-text-disabled`          |
| `text/inverted`          | `#111111`   | `color/gray/900`      | `weave-ds-text-inverted`          |
| `text/primary`           | `#ffffff`   | `color/base/white`    | `weave-ds-text-primary`           |
| `text/secondary`         | `#ffffff`   | `color/base/white`    | `weave-ds-text-secondary`         |

### Spacing Tokens — three scale vocabularies confirmed, with real values

```
border:  none=0  thin=1  regular=2  medium=3  thick=4        (numeric index, GAP-less step names)
radius:  none=0  xs=4  s=8  m=12  l=16  xl=20  2xl=24  full=99999   (t-shirt scale)
space:   0=0  1=2  2=4  3=8  4=12  5=16  6=24  7=32  8=48  9=56     (numeric index)
```

`radius/full = 99999` — not a real pixel measurement, a value chosen to force a full pill regardless
of the element's own size. Record it as that, not as a length to reproduce literally elsewhere.

### Type Primitives and Type Tokens — confirms the earlier text-style reading

`font/fontFamily/primary = "Lexend Deca"`, sizes `12/14/16/18/20/24`, weights `light=300`,
`regular=400`, `medium=500`. Every `Type Tokens` entry (Display/Heading, Display/Time, Display/Title,
UI/Button, UI/Caption, UI/Description, UI/Label, UI/Label-emphasis) aliases fontFamily, size and
weight from these primitives — consistent with `figma-file.md`'s finding that all eight text styles
bind every facet to a variable.

### Opacity Primitives — the collection nobody recorded

Eleven steps, `50` through `1000`, each an integer **0–100** (Figma's own opacity unit), each
carrying a description translating it to the 0–1 fraction code would use (`opacity/400` →
_"In code this is 0.4"_). Five `Color Tokens` entries (`surface/ghost`, `surface/overlay`,
`surface/subtle`, `text/disabled`, `text/secondary`) carry a description pointing at one of these —
e.g. `surface/overlay`: _"Bind layer opacity to opacity/400 where this is used. Previously baked as
#111111 @40%."_ That is a live instruction to compose two tokens (a solid color + a separate opacity
step), not to bake alpha into the color.

## What it appears to mean (inferred)

- **The alpha-baking is mid-migration, and inconsistent right now.** Five `Color Tokens` entries
  carry an explicit note to compose color + `opacity/*` instead of baking alpha. But
  `interactive/selectedBg` (`#5146e666`) and `surface/primary` (`#1e1e1ee5`, via `gray/800-90`)
  still resolve to alpha baked directly into the primitive, with no such note. This reads as the same
  fix applied to some tokens and not yet to others — not a decided convention either way.
- **`surface/ghost` and `surface/overlay` both resolve to the exact same primitive** (`gray/900`,
  `#111111`) and differ only by which opacity step their description points at. If that is
  intentional, the DTCG semantic layer should express it as one color token composed at two different
  opacities, not two separately-named color tokens that happen to collide.
- **`border/primary` is the only entry under `Color Tokens` that is not a `surface`/`text`/`brand`/
  `interactive`/`control` role** — it may belong to a `border` sub-namespace that does not exist yet
  in this collection, or the collection may simply be a flat bag with no intended sub-grouping. Not
  resolved by this read.

## Problems found

1. **Every prior variable count in this repo was stale.** `.figma/manifest.json` said 87; the file
   had 154. `Opacity Primitives` appeared in neither `identity.variableNaming.observed` nor
   `identity.variableCollections` (empty regardless), nor in `figma-file.md`'s collection table. Any
   decision made by reading only those documents before this read would have been made against a
   smaller, older file. `.figma/manifest.json` has since been corrected (`3fcd1e2`);
   `identity.variableCollections` and `figma-file.md`'s table have not — see the superseded notice
   added to the latter.
2. **Three naming vocabularies for a "step", confirmed with real values, still unresolved.**
   `space/0..9` is a numeric index; `radius/none..full` is a t-shirt scale; `border/none..thick` is a
   third vocabulary (`none/thin/regular/medium/thick`) that is neither.
3. **`interactive/selectedBg` is camelCase**; every other path in the file is lowercase-with-slashes.
4. **`control/waveform` and `control/off`** sit in the same global `Color Tokens` collection as
   `brand/*`, `surface/*`, `text/*` — component-specific names in a namespace otherwise reserved for
   roles.
5. **Alpha-baking convention is inconsistent** — see "What it appears to mean" above. This is a new
   finding this read surfaced; it was not visible in the prior 87-variable snapshot because the
   opacity-composition notes did not exist there (`Opacity Primitives` did not exist there).
6. **The prefix conflict from the manifest is unaffected by this read and still open**:
   `codeSyntax.WEB` carries `weave-ds-*`; `ds.config.json` now says `juro`; `.figma/manifest.json →
identity.prefix` still says `ds`. All three still disagree.

## Open questions

- Is `Opacity Primitives` new, or did the manifest simply never capture it? No way to tell from this
  file alone — worth asking whoever last edited the Figma source.
- Which of the three step vocabularies (`space` numeric, `radius` t-shirt, `border` named) should the
  DTCG token set standardize on, and does `border` become its own file (`border.json`) with its own
  vocabulary, or fold into one of the other two?
- Does the alpha-baking migration (bare color vs. color+opacity composition) get finished before
  tokens are generated, or does the DTCG set encode today's inconsistency and flag it for later?
- Should `control/waveform` and `control/off` move to a component-scoped token file, or a `control.*`
  semantic group of their own within `color.semantic.json`?
