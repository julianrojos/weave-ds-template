# ADR 0007 - Opacity is composed separately from color

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** julianrojos
- **Tags:** tokens, color, opacity, figma
- **Related:** [ADR 0008 - Global color roles preserve the measured semantic families](./0008-global-color-roles-preserve-the-measured-semantic-families.md), [ADR 0010 - Web compiles color and opacity roles into derived paints](./0010-web-compiles-color-and-opacity-roles-into-derived-paints.md)

## Context

[Report 0003](../research/0003-figma-token-inventory.md) found a half-completed migration. Five color
roles explicitly instruct consumers to combine a solid color with an opacity variable:
`surface/ghost`, `surface/overlay`, `surface/subtle`, `text/disabled` and `text/secondary`.

`interactive/selectedBg` and `surface/primary` carry no such instruction. They still alias
alpha-bearing primitives: `purple/500-40` resolves with 40% alpha and `gray/800-90` with 90% alpha.
Splitting those two into their opaque RGB and corresponding opacity step is an inference from the
measured name and value, not an instruction measured in Figma.

Keeping both representations would make alpha ownership unpredictable: some callers would consume a
single color and others would need two properties to reproduce the same kind of result.

## Decision

1. Canonical palette colors are solid. Alpha is represented by an opacity token and composed at the
   usage site; transparent remains the one literal transparent color primitive.
2. The incomplete Figma migration is completed in code by decision. `interactive.selected-bg` uses
   `color.purple.500` with `opacity.interactive.selected-bg = opacity.400`; `surface.primary` uses
   `color.dark.700`, whose literal equals the opaque RGB component measured under the legacy
   `gray/800-90` name, with `opacity.surface.primary = opacity.900`.
3. The five explicitly measured pairs are `surface.ghost`/`opacity.100`,
   `surface.overlay`/`opacity.400`, `surface.subtle`/`opacity.200`,
   `text.disabled`/`opacity.400` and `text.secondary`/`opacity.600`.
4. A semantic opacity path pairs with the semantic color path that has the same suffix:
   `opacity.<role>` pairs with `color.<role>`. This path relationship, not `$description` prose,
   is the machine-readable contract.
5. Figma's `color/purple/500-40` and `color/gray/800-90` remain recorded as intentional drift; they
   do not become canonical DTCG palette tokens.

## Contract

| Concern                        | Where                                                               |
| ------------------------------ | ------------------------------------------------------------------- |
| Solid palette                  | `packages/tokens/tokens/color.palette.json`                         |
| Semantic colors                | `packages/tokens/tokens/color.semantic.json`                        |
| Primitive and semantic opacity | `packages/tokens/tokens/opacity.json`                               |
| Intentional Figma drift        | `.figma/maps/tokens.json`                                           |
| Authoring rule                 | `packages/tokens/tokens/README.md`                                  |
| Alias resolution               | `packages/tokens/style-dictionary.config.mjs` (`pnpm build:tokens`) |
| Pair integrity                 | `scripts/verify-tokens.mjs` (`pnpm verify:tokens`, gated in CI)     |

## Consequences

**Positive**

- Alpha has one owner and every affected role can be inspected or changed independently.
- Two roles may share a solid color while retaining different opacity semantics.
- The reference token set no longer canonizes a migration artifact from Figma.

**Negative / trade-offs**

- A color token alone is insufficient for seven roles; each platform needs a defined composition
  mechanism. The web mechanism is recorded separately in ADR 0010.
- Figma continues to report two obsolete alpha-bearing primitives until the design file is migrated.
- The `surface.primary` mapping follows measured RGB rather than the misleading `gray/800-90` name.

## Alternatives considered

**Keep alpha baked into every affected color.** Rejected because five Figma descriptions explicitly
state the opposite migration direction and independent opacity tokens already exist.

**Preserve today's mixture.** Rejected because it would turn an acknowledged intermediate state into
the permanent code contract.
