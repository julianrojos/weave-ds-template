# Prop map proposal — Tag

- **Status:** Proposal. Nothing is built.
- **Source:** [`Tag_orig`](https://www.figma.com/design/CAZybLope1cikvLyECBQnD/weave-DS---Mokkap-masterclass-29-08-2026--Copy-?node-id=4323-266) (node `4323:266`), imported into the source file
- **Read alongside:** [`../prop-map.md`](../prop-map.md) §1–2, `packages/contracts/components/README.md` §2
- **Measured from the file**, not read off a screenshot — every value below came from the nodes,
  including the variables each one binds.
- **CORRECTED 2026-09-21.** The first pass measured the twenty variants and the nodes inside them,
  and never called `componentPropertyDefinitions` on the component set — where BOOLEAN and TEXT
  properties live. It therefore missed two of the set's five properties and stated the opposite of
  one of them in §5. What follows is the re-measurement; §5 records what the earlier claim was and
  why it was wrong.

## 1. What the design actually contains

The set declares **five component properties**, not three:

| Property          | Type    | Default   | Bound to                                          |
| ----------------- | ------- | --------- | ------------------------------------------------- |
| `Scheme`          | VARIANT | `Brand`   | — (Brand · Neutral · Positive · Danger · Warning) |
| `State`           | VARIANT | `Default` | — (Default · Hover)                               |
| `Variant`         | VARIANT | `Primary` | — (Primary · Secondary)                           |
| `Removable#147:0` | BOOLEAN | `true`    | the `X` instance's **`visible`**                  |
| `Label#9765:0`    | TEXT    | `"Tag"`   | the `Tag` text node's **`characters`**            |

Across the whole set there are exactly two property references, and both hold in all twenty
variants: `Tag :: {"characters": "Label#9765:0"}` and `X :: {"visible": "Removable#147:0"}`.

Twenty variants over the three VARIANT axes: `Scheme` × `State` × `Variant`. 5 × 2 × 2 = 20, all
present. The two non-variant properties are orthogonal to that grid: a boolean and a text value do
not multiply it, which is why counting variants cannot find them.

**Geometry is identical in all twenty.** 68 × 32, padding 8 on every side, gap 8, corner radius
bound to `Radius/200`. Nothing but colour varies across the set.

**Anatomy is the same in all twenty**, in this order: a `TEXT` reading `Tag`, then an `INSTANCE`
named `X` measuring 16 × 16, holding one 8 × 8 vector.

The X **renders** in all twenty, and that is a consequence rather than a fact about the component:
`Removable` defaults to `true`, and the twenty variants are the grid of the three VARIANT axes at
that default. Its `visible` is bound to the property, so a consumer can switch the control off. A
count of renderings cannot distinguish "always present" from "present at the default" — which is
exactly the mistake the first pass made.

Backgrounds and text colours, measured (`State=Default`):

| Scheme   | Primary bg                    | Primary text                | Secondary bg                    | Secondary text                        |
| -------- | ----------------------------- | --------------------------- | ------------------------------- | ------------------------------------- |
| Brand    | `Background/Brand/Default`    | `Text/Brand/On Brand`       | `Background/Brand/Tertiary`     | `Text/Brand/On Brand Tertiary`        |
| Danger   | `Background/Danger/Default`   | `Text/Danger/On Danger`     | `Background/Danger/Secondary`   | `Text/Danger/On Danger Secondary`     |
| Positive | `Background/Positive/Default` | `Text/Positive/On Positive` | `Background/Positive/Secondary` | `Text/Positive/On Positive Secondary` |
| Warning  | `Background/Warning/Default`  | `Text/Warning/On Warning`   | `Background/Warning/Secondary`  | `Text/Warning/On Warning Secondary`   |
| Neutral  | `Background/Default/Tertiary` | `Text/Default/Default`      | `Background/Default/Secondary`  | `Text/Default/Default`                |

`State=Hover` changes the background only, to the `… Hover` sibling of whatever the Default binds.
No geometry, no text colour, no anatomy changes with it.

**Every one of those variables is `remote: true`** — they belong to an external library, not to this
repository's collections. The same is true of the `X` component itself.

## 2. What is a prop, and what is not

The set contains one example of each category in [`README.md`](./README.md):

| In Figma                       | Really is                 | Belongs in                                |
| ------------------------------ | ------------------------- | ----------------------------------------- |
| `State=Hover`                  | runtime interaction state | `:hover` — never a prop                   |
| `Scheme=Brand … Neutral`       | an actual prop            | the canon's `variant` axis                |
| `Variant=Primary \| Secondary` | an actual prop            | a new axis — see below                    |
| `Removable` (BOOLEAN)          | an actual prop            | a boolean the consumer sets               |
| `Label` (TEXT)                 | content                   | children — not a prop, and not a variant  |
| the `X` instance               | conditional anatomy       | a part whose presence `Removable` governs |

Note that the two categories the first pass missed are the two that are **not** variant axes. The
four-way sort is usually applied to a variant grid; a BOOLEAN and a TEXT property sit outside it and
have to be fetched separately. That is the procedural lesson, not just the factual one.

**The name trap, stated plainly.** The Figma axis called `Variant` is **not** the canon's `variant`.
The canon's `variant` is _"semantic intent, which selects the colour role"_ — that is `Scheme`.
Figma's `Variant` selects which member of one scheme's family is used. A mechanical import maps
`Variant` → `variant` and is exactly wrong.

**`hierarchy` does not apply**, although the Tag now declares a control. Three reasons, in order of
strength:

1. Only `Button` uses `hierarchy` in this repository. `Dialog` holds real controls in its `actions`
   slot and does **not** take the axis. Hierarchy belongs to the thing that _is_ an action.
2. A rank is relational — Button's contract says _"a page should hold one primary action, and
   everything else ranks below it"_. Twenty tags in a row all marked `primary` assert nothing.
3. The canon says hierarchy is _"distinct from a paint treatment"_, and what was measured is only a
   paint change.

## 3. Proposed surface

### 3.1 Axes

| Axis        | Kind         | Values                                                 | Default   | Notes                                                         |
| ----------- | ------------ | ------------------------------------------------------ | --------- | ------------------------------------------------------------- |
| `variant`   | canon        | `neutral` · `brand` · `success` · `warning` · `danger` | `neutral` | `Scheme=Positive` maps to the canon's `success`.              |
| `treatment` | **new axis** | `solid` · `soft`                                       | `solid`   | Requires a canon entry first — see §9. Not a Tag-local value. |

`size` is deliberately **not** proposed: all twenty variants are 32 tall. One measured size is not a
scale, and a second rung would be invented.

Beside the two axes, one boolean:

| Prop        | Kind    | Type      | Default | Notes                                                                       |
| ----------- | ------- | --------- | ------- | --------------------------------------------------------------------------- |
| `removable` | boolean | `boolean` | `true`  | The measured `Removable#147:0`. Governs whether the `dismiss` part renders. |

Whether `removable` is a boolean prop or a `consumer`-controlled state is the open modelling
question — see §6.3. Either way it is author-set, and the contract has to be able to say it.

### 3.2 Composition, parts and states

- **Children:** the label. Text. The measured `Label#9765:0` confirms it is a value the consumer
  supplies rather than part of the drawing.
- **Parts:** `root`, `label`, `dismiss`.
- **`dismiss`** is a declared part, not a slot: it is the same component at the same size in every
  variant, and is not consumer-supplied content. It takes `role: "button"`, needs an accessible
  name the consumer supplies, and activating it **requests removal** — see §9.
- **`dismiss` is conditional**, not unconditional anatomy: its presence follows `removable`, exactly
  as the design binds its `visible` to that property. A tag that cannot be removed shows no control
  and must expose no callback for one.
- **States:** `hover`, `kind: intrinsic`, `control: internal`. It paints the root's background and
  nothing else.

There is no `disabled` and no `focus-visible` in the design. Neither is invented here; both are
recorded in §8 as gaps.

## 4. How this maps back to the Figma variants

```
Scheme=Neutral      -> variant=neutral      Variant=Primary    -> treatment=solid
Scheme=Brand        -> variant=brand        Variant=Secondary  -> treatment=soft
Scheme=Positive     -> variant=success      State=Default      -> (no prop)
Scheme=Warning      -> variant=warning      State=Hover        -> :hover, intrinsic state
Scheme=Danger       -> variant=danger
```

5 variants × 2 treatments = 10 author-settable combinations. The other ten Figma variants are the
hover rendering of those same ten, which the browser produces without a prop.

## 5. Deliberately not exposed

- **A `size` axis.** Only one size is drawn. See §3.1.
- **`hierarchy`.** See §2. Using it would require amending the canon's own definition, which is a
  canon change and not a Tag decision.
- **`emphasis` as the name for `treatment`.** The canon already glosses `hierarchy` as _"how much
  emphasis is applied"_, so `emphasis` would collide with an existing concept. `treatment` takes the
  phrase the canon itself uses — _"distinct from a paint treatment"_.
- **Colour, radius and type values.** They are consumer paint (ADR 0003), and the design binds them
  to an external library this repository does not map.
- **An icon slot on `dismiss`.** The design offers exactly one glyph and no property to change it.
  Making it swappable would be inventing a requirement.
- ~~**A `removable` boolean.** The X is in all twenty variants; nothing measured says it is
  optional.~~ **WITHDRAWN 2026-09-21, and it was false.** The set declares `Removable#147:0`, a
  BOOLEAN defaulting to `true`, bound to the X's `visible` in all twenty variants. The sentence
  above turned an absence I had created — by not querying the set's properties — into a positive
  finding, which is the precise failure §4 of the authoring contract warns about. `removable` is
  now part of the proposed surface, in §3.

## 6. What must be decided before a contract is written

1. **Accept `treatment` into the canon**, with the wording in §9, or reject it and drop the axis.
2. **Accept the one-way activation primitive** the `dismiss` part needs, or model removal another
   way. The schema has no way to express it today — see §9.
3. **How `removable` is modelled.** A boolean prop, or a `consumer`-controlled state? A state gets
   ADR 0004's machinery for free and can gate `visibleWhen` on the `dismiss` part, which is how
   every other conditional part in this repository works. A bare axis-like boolean would need a new
   rule. The state reading looks right and is not yet decided.
4. **What renders inside `dismiss`.** The design draws a glyph from an external library. The
   contract currently declares no content for that part, so the emitted control is an empty button.
   Either the part takes content, or the contract says the consumer supplies the glyph.
5. **The hit area.** See §8; the contract has to claim something.

## 7. Decisions, 2026-09-21

| Question         | Decision                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Variant` → axis | Not `hierarchy`. A new canonical axis `treatment` (`solid` \| `soft`).                                                                       |
| `Scheme` → axis  | The canon's `variant`, with `Positive` → `success`.                                                                                          |
| `State=Hover`    | Intrinsic state, `control: internal`. Never a prop.                                                                                          |
| The X            | A declared part with button semantics, not a slot. Reversed from an earlier call that leaned on a weak analogy with Dialog's `actions` slot. |
| Schema gap       | Extend the schema now rather than deferring, as `derivedFrom` was added for Avatar.                                                          |

## 8. Problems found

1. **The remove control is 16 × 16.** Every interactive contract in this repository declares
   `a11y.minHitArea`, and the floor is 24 (`Button`, `Checkbox`, `Switch`, `RadioItem`, `TextField`);
   the larger targets claim 44. A 16 px visual glyph can still carry a ≥ 24 px hit area through
   padding, but the design as drawn does not show one, so the contract's claim and the design do not
   yet agree.
2. **Token tiers do not correspond across families, and the reason is measured.**
   `Background/Brand/Secondary` **does not exist** in the source library — the Brand family offers
   only `Default` and `Tertiary`, so `Tertiary` was the only subtle step available. Where a choice
   existed, the design took `Secondary` (Danger, Positive, Warning). Neutral uses `Tertiary` for
   solid and `Secondary` for soft, which crosses the tier names but preserves the visual order,
   `#d9d9d9` having more presence than `#f5f5f5`. **This is an asymmetry in the library's own
   inventory, not evidence of a mistake in the design**; whether the naming is intentional cannot be
   determined from this file.
3. **No `disabled` and no `focus-visible` are drawn**, though the Tag now declares a focusable
   control. A focus indicator is an accessibility requirement the design does not answer.
4. **Everything binds to an external library.** No colour, radius or type value here maps to this
   repository's tokens, so every paint channel stays `null` and the consumer's theme supplies them.

## 9. The extension this requires

**A canon entry for `treatment`**, defined by visual presence rather than by saturation or by token
tier — both of those break on Brand and Neutral, as §8.2 shows:

```json
"treatment": {
  "concept": "Visual treatment applied to a surface, independently of its semantic intent. `solid` has more visual presence; `soft` is deliberately more contained. Orthogonal to `variant`, which chooses which colour role is used, and distinct from `hierarchy`, which ranks actions.",
  "values": ["solid", "soft"],
  "default": "solid"
}
```

**A one-way activation primitive.** `activates` offers `toggles` and `between`; both describe a
reversible change, and all five existing uses are genuine toggles (`checked`, `open`, `member`).
Removing a tag is irreversible and, more importantly, **the component cannot perform it** — only the
owner of the list can. The proposed shape keeps the schema's rule that activation _"takes one named
thing"_:

```json
"activates": { "requests": "remove" }
```

`requests` says the part asks its consumer to do something and does not do it itself, which is the
same distinction `control` already draws for states. It compiles to one native request channel per
backend — a callback prop or an emitted event — with no per-component mapping, exactly as `control`
values do under ADR 0004.

Both need an ADR before they are mechanized, and the four backends must each emit or explicitly
report non-conformance, as ADR 0005 requires.
