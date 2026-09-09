# ADR 0009 - Component-specific values stay out of the global token package

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** julianrojos
- **Tags:** tokens, components, figma, ownership
- **Related:** [ADR 0008 - Global color roles preserve the measured semantic families](./0008-global-color-roles-preserve-the-measured-semantic-families.md)

## Context

[Report 0003](../research/0003-figma-token-inventory.md) found `control/waveform` and `control/off`
inside the otherwise role-based `Color Tokens` collection. Neither name identifies an owning code
component, and the repository's component contracts deliberately leave paint sources unbound.

Promoting them to global semantics would make local implementation details part of the public token
API. Assigning them to a component now would require guessing an owner that the report did not
measure.

## Decision

1. A value with one component owner does not become a global DTCG token.
2. `control/waveform` and `control/off` remain `code: null` in the Figma map until an owning component
   contract exists. Their primitive colors remain available as `color.green.300` and
   `color.red.500`; the component association does not.
3. When ownership is known, the component exposes the value through its unbound paint channel or a
   documented component property in the consumer theme. It does not add a `color.control.*` family
   to the global package.
4. Intentional exclusions carry a map note so `null` is distinguishable from unmeasured work.

## Contract

| Concern                      | Where                                                                   |
| ---------------------------- | ----------------------------------------------------------------------- |
| Global-token boundary        | `packages/tokens/tokens/README.md`                                      |
| Intentional exclusions       | `.figma/maps/tokens.json`                                               |
| Paint source remains unbound | `docs/ADR/0003-paints-name-the-channel-and-leave-the-source-unbound.md` |
| Component authoring surface  | `packages/contracts/components/README.md`                               |
| Correspondence enforcement   | `scripts/verify-figma.mjs` (`pnpm verify:figma`, gated in CI)           |

## Consequences

**Positive**

- Global tokens remain reusable roles rather than an inventory of component internals.
- No component ownership is invented from a Figma name.
- The measured values are not lost because their palette primitives remain canonical.

**Negative / trade-offs**

- Two Figma variables intentionally remain drift after reconciliation.
- A future component owner requires an explicit map update and theme wiring step.
- Figma users can still bind these variables globally until the design source itself is reorganized.

## Alternatives considered

**Create `color.control.waveform` and `color.control.off`.** Rejected because it turns two local names
into a permanent global family without evidence that other components share the roles.

**Assign both values to a guessed component now.** Rejected because the research report does not
identify an owner and the repository forbids filling an unmeasured gap with a plausible answer.
