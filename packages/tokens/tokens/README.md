# Token source

**Authoring format: [DTCG](https://tr.designtokens.org/format/)** — every token is `$value` +
`$type`, and a token that references another uses `{dot.path}`.

This project carries a reference token set measured in
[`docs/research/0003-figma-token-inventory.md`](../../../docs/research/0003-figma-token-inventory.md)
and decided in ADRs 0005-0009 before being committed here. See
[`../../../.figma/README.md`](../../../.figma/README.md) for how to read the design source and what it
can and cannot tell you. An invented token set is worse than none: it looks authoritative and nobody
re-checks it.

## 1. File naming

One file per group: `<group>.json`. Split by _what the token is_, never by _where it is used_.

```
color.palette.json     primitives — raw ramps, no meaning
color.semantic.json    roles — aliases into the palette
space.json  radius.json  typography.json  border.json  shadow.json  motion.json
```

## 2. Tiers — and the rule that makes them worth having

Tokens resolve top-down through `var()`:

| Tier                        | Example                                      | May reference             |
| --------------------------- | -------------------------------------------- | ------------------------- |
| **Primitive**               | `color.purple.500` = `#5146e6`               | nothing — it is a literal |
| **Semantic**                | `color.brand.primary` = `{color.purple.500}` | primitives only           |
| **Component customization** | an unbound paint channel in a contract       | semantics in the theme    |

The global semantic families preserve the measured reusable intent: `color.brand`, `color.surface`,
`color.text`, `color.border` and `color.interactive`. A component contract names paint channels and
leaves their source unbound; its consumer theme wires those channels to semantic roles. Components
never consume palette primitives directly. See ADR 0008.

## 3. From a Figma variable to a token

The mapping rule is **data, not an assumption baked into a script** — it lives in
`.figma/manifest.json → identity.variableNaming`, and until it has been measured against the real
file it is flagged `separatorUnknown: true`. Read it before writing a token.

The trap it records: a Figma variable has both a slash-separated `name` and an optional
`codeSyntax.WEB`. The latter carries a `weave-ds-` prefix and is observed metadata, not the canonical
code name. The configured prefix comes only from `/ds.config.json`.

```
surface/primary       ->  color.surface.primary       ->  --juro-color-surface-primary
space/3               ->  space.3                     ->  --juro-space-3
interactive/selectedBg -> color.interactive.selected-bg -> --juro-color-interactive-selected-bg
```

## 4. Naming rules

- **kebab-case** for every segment. `interactive-selected-bg`, never `interactiveSelectedBg` and
  never the run-on `interactiveselectedbg`.
- **One vocabulary inside each family.** Families may differ deliberately: spacing uses numeric
  indices, radius uses t-shirt sizes and border width uses named weights. Mixing vocabularies inside
  one family is a defect. See ADR 0006.
- **A numeric step is an index, not a value.** If `space.3` is `8px`, say so in `$description` —
  otherwise every reader guesses, and half of them guess `3px`.
- **No component-specific tokens in the global namespace.** A token used by exactly one component
  is that component's business; keep its paint source unbound until a consumer theme supplies it.
  See [ADR 0003](../../../docs/ADR/0003-paints-name-the-channel-and-leave-the-source-unbound.md)
  and [ADR 0009](../../../docs/ADR/0009-component-specific-values-stay-out-of-the-global-token-package.md).
- **Opacity is separate from color.** Palette colors are solid except `color.base.transparent`.
  A semantic opacity pairs with the semantic color that has the same suffix:
  `opacity.surface.overlay` + `color.surface.overlay`. Never encode that relationship only in a
  description or add a baked-alpha palette rung. See ADR 0007.

## 5. Consuming translucent paints on web

The build turns every homonymous semantic color and opacity pair into one derived paint property:

```css
background-color: var(--juro-paint-surface-overlay);
```

The generated value is a resolved `rgb(r g b / a)` color. Do not apply the semantic opacity with the
element-wide `opacity` property: that would also dim text, icons and descendants. Derived paints are
generated output rather than a third source-token tier; see ADR 0010.

## 6. Modes and themes

If the system has more than one theme, model it as **one file per axis**, composed as classes —
not as a `light`/`dark` key inside every token. That keeps a new theme to one new file rather than
an edit to every existing one.

A system with only one theme should say so out loud in the exploration report. Dark-only _by
decision_ is fine; dark-only _by omission_ is a finding.
