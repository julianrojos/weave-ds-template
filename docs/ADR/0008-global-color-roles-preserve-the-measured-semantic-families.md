# ADR 0008 - Global color roles preserve the measured semantic families

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** julianrojos
- **Tags:** tokens, color, semantics
- **Related:** [ADR 0007 - Opacity is composed separately from color](./0007-opacity-is-composed-separately-from-color.md), [ADR 0009 - Component-specific values stay out of the global token package](./0009-component-specific-values-stay-out-of-the-global-token-package.md)

## Context

Figma's `Color Tokens` collection contains role families named `brand`, `surface`, `text`, `border`,
`interactive` and `control`. [Report 0003](../research/0003-figma-token-inventory.md) measured fifteen
entries and found that the first five families describe reusable interface intent, while the two
`control/*` entries describe particular UI objects.

Renaming the reusable families to a new `fill`/`on` vocabulary would require inventing distinctions
that the measured source does not establish. Copying every name unchanged would preserve the one
camelCase segment and would treat component values as global roles.

## Decision

1. Global semantic color tokens retain the measured reusable families: `color.brand`,
   `color.surface`, `color.text`, `color.border` and `color.interactive`.
2. Semantic tokens alias palette primitives and never contain color literals.
3. Syntax is normalized without changing intent: `interactive/selectedBg` maps to
   `color.interactive.selected-bg`.
4. Components and consumer themes use semantic roles rather than palette primitives. A component
   paint channel remains unbound in the agnostic contract and is wired by the consuming theme.
5. `semantic` is a source-file classification, not a token-path segment.

## Contract

| Concern                          | Where                                                                   |
| -------------------------------- | ----------------------------------------------------------------------- |
| Semantic aliases                 | `packages/tokens/tokens/color.semantic.json`                            |
| Palette primitives               | `packages/tokens/tokens/color.palette.json`                             |
| Authoring and consumption rules  | `packages/tokens/tokens/README.md`                                      |
| Unbound component paint channels | `docs/ADR/0003-paints-name-the-channel-and-leave-the-source-unbound.md` |
| Figma correspondence             | `.figma/maps/tokens.json` (`pnpm verify:figma`, gated in CI)            |

## Consequences

**Positive**

- The code vocabulary is traceable to measured design intent.
- Semantic aliases can change without modifying palette values or component contracts.
- File organization does not leak into generated custom-property names.

**Negative / trade-offs**

- The role taxonomy is intentionally incomplete; it has no success, warning or danger families yet.
- `brand` remains available globally even though direct component use is usually too specific.
- A future multi-theme system may need to split semantic values into theme-specific source files.

## Alternatives considered

**Replace the measured families with `fill`, `on` and `border`.** Rejected because the source does not
provide enough evidence to map every role without inventing semantics.

**Copy the Figma collection one-to-one.** Rejected because `control/*` is not global intent and
`selectedBg` violates the chosen path syntax.
