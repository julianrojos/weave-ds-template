# The Figma file

What is actually in the design source, measured rather than assumed.

**Source:** `.figma/manifest.json` → `sources.weave`. Read the key from there; never hard-code it.

Variable, collection and style facts below were measured live on **2026-09-10** through the Desktop
Bridge. The page and component inventories were re-measured on **2026-09-11** through the Figma
Plugin API. Collection and style **names** are the stable join; node ids are not. Re-derive before
relying on any of it — this file is a snapshot, and the source is a working design file, not a frozen
library.

> The file is **not published as a library** (`sources.weave.published: false`), so nothing here has
> a durable `componentKey`. Every id is file-local and refreshable.

## Variable collections — 6, and every one has a single mode

| Collection           | Modes     | Variables | Types         | Tier      |
| -------------------- | --------- | --------- | ------------- | --------- |
| `Color Primitives`   | `Mode 1`  | 71        | COLOR         | primitive |
| `Color Tokens`       | `Mode 1`  | 15        | COLOR         | **token** |
| `Type Primitives`    | `Default` | 10        | FLOAT, STRING | primitive |
| `Type Tokens`        | `Mode 1`  | 24        | STRING, FLOAT | **token** |
| `Spacing Tokens`     | `Mode 1`  | 23        | FLOAT         | **token** |
| `Opacity Primitives` | `Mode 1`  | 11        | FLOAT         | primitive |

154 variables in total.

**Bind to the token tier. Never to the primitive tier.** A primitive is a raw value with no role;
binding one produces a component that silently opts out of every axis the token layer will carry.
Scope every lookup by collection id — names repeat across the two tiers.

**The tier split above is observed, not decided.** `.figma/manifest.json` →
`identity.variableCollections` now records the collection → DTCG source-file mapping measured on
2026-09-10. Treat that as source correspondence, not as a policy decision that settles the naming,
scope or role issues recorded in the manifest.

### Single mode is the fact that shapes everything

Every collection has exactly one mode — that part is measured. There is **no light/dark axis, no
density axis, no shape axis** — nothing to flip. The manifest records the mode's appearance as
`identity.themes: { modes: ["dark"], decided: false }`: dark-only by observation, not yet _decided_
to be dark-only, and `modesConfidence` there flags `"dark"` itself as an observed appearance rather
than a Plugin API measurement.

Two consequences, both load-bearing:

1. **The mode-flip verification cannot run.** It is the strongest check in `property-check.md` and
   in `ds-figma-document`. Report that it did not run; never imply it passed.
2. **A binding cannot be proven correct by observation here.** With one mode, a bound value and a
   baked literal look identical on the canvas. The only way to tell them apart is to inspect
   `boundVariables` on the node. Do that; do not trust the render.

## Text styles — 8

All Lexend Deca. All three type facets bind to variables (`fontSize`, `fontFamily`, `fontWeight`),
which is why type should be applied as a **style** and never as a hand-set `fontName` + `fontSize`.

| Style               | Weight | Size | Line height  | Letter spacing |
| ------------------- | ------ | ---- | ------------ | -------------- |
| `UI/Button`         | Medium | 16   | **124.875%** | 0%             |
| `UI/Label`          | Light  | 16   | AUTO         | 0%             |
| `UI/Label-emphasis` | Medium | 16   | AUTO         | 0%             |
| `UI/Description`    | Light  | 14   | AUTO         | 0%             |
| `UI/Caption`        | Light  | 12   | AUTO         | 0%             |
| `Display/Heading`   | Medium | 20   | AUTO         | 0%             |
| `Display/Time`      | Medium | 16   | AUTO         | 0%             |
| `Display/Title`     | Medium | 24   | AUTO         | 0%             |

### The line-height defect, corrected

`UI/Button` is the only style with an explicit line height. The other seven are `AUTO` — Figma's
font-metric default, which is not a number the type scale controls.

**This matches the manifest's own correction.** `.figma/manifest.json` → `identity.font.knownProblems`
now records that it previously said _"UI/Button uses 1.2487 while every other style uses 100"_ — the
`100` was wrong: measured, the others are `AUTO`, and `AUTO` and `100%` are different things. The
defect is real but it is worse than first recorded — seven styles have **no controlled line height at
all**, rather than a consistent one that disagrees with an eighth.

Do not fix this inside a component. Record it, and let `ds-decide` settle whether the type scale
owns line height. Every set generated before it is settled inherits the inconsistency.

### 124.875% is a red flag on its own

A line height of `124.87499713897705%` is not a designed value; it is a dragged handle. Treat it as
evidence when the type-scale ADR is written, not as a number to reproduce.

## Effect styles — none. Paint styles — none.

There are **zero** local effect styles and **zero** local paint styles.

This matters more than it looks:

- **There is nothing to bind a shadow to.** The upstream version of this skill instructs you to bind
  elevation to an effect style. Here that instruction has no target. A shadow you add is a literal
  until an effect-style set exists — so annotate it as one, per the honesty rule, or leave it out.
- **Colour lives entirely in variables, not paint styles.** That is the modern arrangement and it is
  the right one; noted here only so an absent paint-style list is not read as an incomplete scan.

## Pages

Measured **2026-09-11**. 15 pages. The structure is now a mix of source material, example boards,
an import page and test pages.

```
Starter UI kit          ← the original component kit lives here
Component API Examples
Token System Examples
Cheat Sheet
Pipeline
Imported
-----------
Design Language
├ Primitives
├ Color                 ← the ramp/opacity exploration boards
├ Typography
├ Icons
---
test-juro_1
test-juro_3
```

The component taxonomy pages recorded in the previous source are not present in this copy. Putting a
generated set on a destination page therefore needs a fresh page decision rather than assuming the
old taxonomy still exists.

## Components — 58 sets and 35 loose components

Measured **2026-09-11**, page by page across all 15 pages. The original 44 sets and 35 loose
components remain on `Starter UI kit`; 14 additional sets now live on five other pages. There is no
component taxonomy in this copy to sort them into — see the note above.

| Page                     | Component sets | Loose components |
| ------------------------ | -------------: | ---------------: |
| `Starter UI kit`         |             44 |               35 |
| `Component API Examples` |              1 |                0 |
| `Imported`               |              1 |                0 |
| `├ Icons`                |              1 |                0 |
| `test-juro_1`            |              5 |                0 |
| `test-juro_3`            |              6 |                0 |
| Other nine pages         |              0 |                0 |
| **Total**                |         **58** |           **35** |

`test-juro_3` holds six `TabItem` candidate sets from a model comparison, and none is reconciled
with `TabItem.contract.json`. Four were measured on **2026-09-15**: `TabItem_GPT-5.5_Alto` and the
three Claude sets. Only `TabItem_GPT-5.5_Alto` has the contract's separate `indicator` part and an
inside focus ring, and it still diverges — Disabled dims the whole tab through root opacity where
the contract dims the label, and Hover's label colour was not checked. `TabItem_GPT-5.5_Medio` and
`TabItem_GPT-5.6_Sol_Alto` were not measured. Which candidate becomes `TabItem` is a design decision
to take before any of them is recorded in `.figma/maps/components.json`.

The original `Starter UI kit` inventory breaks into roughly three groups:

| Group                      | Examples                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Material-style icon glyphs | `graphic_eq`, `desktop_mac`, `videocam`, `mic`, `crop_16_9`, `settings`, `notifications`, `close`, `keyboard_arrow_down`        |
| Product UI                 | `main-ui-button`, `button`, `options`, `options-dropdown`, `toggle-switch`, `dropdown`, `settings-tabs`, `webcam-overlay`       |
| Feature-specific           | `controls-pause`, `controls-stop`, `scenes-control-button`, `notes-button`, `notes-save-indicator`, `mic-sound`, `system-sound` |

Three things to know before touching any of them:

1. **The `Starter UI kit` inventory did not come from this repo.** Those 44 sets and 35 loose
   components are a designer's hand-built kit, and `ds-figma-document` is the skill that works on
   them. Provenance outside that page is recorded in `.figma/maps/components.json`: a set is
   reconciled with code only if that map has an entry pointing at it. Do not infer provenance from a
   set's name or appearance.
2. **The naming is not the repo's canon.** `button` / `main-ui-button` / `closeButton` /
   `settingsButton` mix cases and conventions in one file. `.ai/maps/prop-map.md` §1 is the canon for
   anything you create. Do not rename someone's existing component as a side effect.
3. **The icon glyphs are already one-component-per-glyph**, which is the shape this skill wants —
   but they are named bare (`mic`, not `Icon/mic`), so they do not group in the Assets panel. Worth
   an ADR before a bulk rename; worth _not_ doing quietly.

## Re-deriving what moved

Names are the join. Ids are not.

```js
// collections and variables, scoped by tier
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const colId = (n) => (cols.find((c) => c.name === n) || {}).id;
const scoped = (colName) => {
  const id = colId(colName);
  return (n) => vars.find((v) => v.name === n && v.variableCollectionId === id);
};
const TOKEN = scoped('Color Tokens'); // never scoped('Color Primitives')

// text styles
const textStyles = await figma.getLocalTextStylesAsync();
const style = (n) => textStyles.find((s) => s.name === n);

// a component set by name, across pages
await figma.loadAllPagesAsync();
const set = figma.root.findAll((n) => n.type === 'COMPONENT_SET' && n.name === '<Name>')[0];

// a page — check before creating, and use the async setter
const page = figma.root.children.find((p) => p.name === '<target page name>');
if (!page) throw new Error('destination page must be decided — see figma-file.md');
await figma.setCurrentPageAsync(page); // sync assignment throws under dynamic-page
```

If a lookup returns `undefined`, **stop and re-measure**. Do not fall back to a literal and carry on
— that is exactly how a board or a set quietly stops matching the system.

## Refreshing this file

Re-run the measurement and rewrite the tables when any of them stops matching:

```js
// collections, styles, pages, component inventory — one pass
await figma.loadAllPagesAsync();
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const textStyles = await figma.getLocalTextStylesAsync();
const effectStyles = await figma.getLocalEffectStylesAsync();
const paintStyles = await figma.getLocalPaintStylesAsync();
```

Put the date on it. A snapshot without a date is indistinguishable from a claim about the present.
