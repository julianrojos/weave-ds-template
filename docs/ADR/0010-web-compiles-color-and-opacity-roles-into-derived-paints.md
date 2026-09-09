# ADR 0010 - Web compiles color and opacity roles into derived paints

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** julianrojos
- **Tags:** tokens, web, css, opacity
- **Related:** [ADR 0007 - Opacity is composed separately from color](./0007-opacity-is-composed-separately-from-color.md)

## Context

ADR 0007 gives color and opacity independent semantic ownership, but two custom properties are not
by themselves a CSS paint. Applying `opacity` to an element is not equivalent: it also affects the
element's content and descendants. Combining them at runtime with relative color syntax or
`color-mix()` would make the token package depend on a browser feature baseline the repository does
not declare.

The source relationship is already unambiguous without another registry: every semantic opacity
path has a semantic color path with the same suffix. The build can validate that pair and derive a
finished paint without adding a second source of truth.

## Decision

1. On web, every non-primitive `opacity.<role>` token must have a `color.<role>` token.
2. `pnpm build:tokens` resolves each pair at build time and emits one additional CSS custom property
   named `--{tokenPrefix}-paint-<role>`. It also exposes that property through the generated
   TypeScript constant map.
3. A component that needs translucent color consumes the derived paint property, for example
   `background-color: var(--juro-paint-surface-overlay)`. It does not apply the paired token through
   the element-wide `opacity` property.
4. The derived paint is generated output, not another DTCG source token. Color and opacity remain the
   only authored values, so changing either and rebuilding cannot leave a stale composite behind.
5. The current web compiler emits resolved modern `rgb(r g b / a)` values. It does not require
   runtime `color-mix()` or relative color syntax. A future theme axis must emit its derived paints
   inside the same selector as that theme's source roles.

## Contract

| Concern                       | Where                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Pair naming and source values | `packages/tokens/tokens/color.semantic.json`, `packages/tokens/tokens/opacity.json` |
| Pair validation               | `scripts/verify-tokens.mjs` (`pnpm verify:tokens`, gated in CI)                     |
| Web paint generation          | `packages/tokens/style-dictionary.config.mjs` (`pnpm build:tokens`)                 |
| Conversion examples           | `packages/tokens/paint.test.mjs` (`pnpm test`)                                      |
| Consumption rule              | `packages/tokens/tokens/README.md`                                                  |

## Consequences

**Positive**

- Components consume one valid color value and cannot accidentally dim their contents.
- The relationship is structural and gated; no parser depends on English descriptions.
- Generated paints work without a runtime dependency on newer CSS color-composition features.

**Negative / trade-offs**

- Overriding a source color or opacity custom property at runtime does not recompute the derived
  paint; a theme must be compiled with its own derived value.
- The CSS and TypeScript outputs contain seven more public properties than the DTCG source has
  tokens.
- Other platforms need their own composition decision; this ADR defines only web output.

## Alternatives considered

**Apply `opacity: var(--juro-opacity-...)` to the component.** Rejected because element opacity also
affects text, icons and descendants, which is not equivalent to a translucent background or border.

**Compose with `color-mix()` or relative color syntax at runtime.** Rejected for now because the
repository declares no browser baseline. It can be reconsidered if runtime overrides become a
requirement and the supported browser set is made explicit.

**Store a third DTCG paint token.** Rejected because it would duplicate a value that is completely
derivable from the color and opacity pair.
