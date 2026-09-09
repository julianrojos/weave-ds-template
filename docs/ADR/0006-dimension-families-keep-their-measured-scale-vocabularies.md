# ADR 0006 - Dimension families keep their measured scale vocabularies

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** julianrojos
- **Tags:** tokens, naming, dimensions
- **Related:** [ADR 0005 - Code identity owns token naming](./0005-code-identity-owns-token-naming.md)

## Context

[Report 0003](../research/0003-figma-token-inventory.md) measured three vocabularies inside Figma's
single `Spacing Tokens` collection: numeric spacing indices, t-shirt radius names and named border
widths. The values are complete, but the report left open whether code should force them into one
vocabulary or preserve each family.

The three families describe different choices. Spacing is a progression with ten rungs; radius
includes a non-numeric `full` sentinel; border widths communicate qualitative weight. A single
vocabulary would rename at least two families without adding shared behavior.

## Decision

1. Each dimension family has one internally consistent vocabulary; different families need not use
   the same vocabulary.
2. `space.0..9` remains a numeric index, `radius.none|xs|s|m|l|xl|2xl|full` remains a t-shirt scale,
   and `border.none|thin|regular|medium|thick` remains a named weight scale.
3. Figma FLOAT values in these families become DTCG `dimension` values in pixels in the web
   reference implementation.
4. Numeric spacing steps carry descriptions stating that the name is an index, not a pixel value.
   `radius.full` is documented as a forced-pill sentinel rather than a meaningful length.
5. The three families remain separate source files even though Figma stores them in one collection.

## Contract

| Concern                     | Where                                                               |
| --------------------------- | ------------------------------------------------------------------- |
| Authoring rules             | `packages/tokens/tokens/README.md`                                  |
| Spacing scale               | `packages/tokens/tokens/space.json`                                 |
| Radius scale                | `packages/tokens/tokens/radius.json`                                |
| Border-width scale          | `packages/tokens/tokens/border.json`                                |
| Figma collection split      | `.figma/manifest.json`, `.figma/maps/tokens.json`                   |
| Syntax and alias resolution | `packages/tokens/style-dictionary.config.mjs` (`pnpm build:tokens`) |

## Consequences

**Positive**

- Code preserves the measured vocabulary and avoids speculative mass renaming.
- Names communicate the kind of choice each family represents.
- Source files follow code ownership rather than Figma collection boundaries.

**Negative / trade-offs**

- A consumer cannot assume that the same suffix means the same rung across dimension families.
- Tooling must support one Figma collection mapping to multiple DTCG files.
- The numeric spacing names need descriptions to prevent readers interpreting `space.3` as `3px`.

## Alternatives considered

**Normalize every family to numeric indices.** Rejected because `radius.full` is not a rung and
border names would lose useful intent.

**Normalize every family to t-shirt names.** Rejected because ten spacing rungs do not have a stable,
widely understood t-shirt vocabulary and the conversion would be arbitrary.
