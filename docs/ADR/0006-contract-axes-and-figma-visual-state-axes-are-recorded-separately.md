# ADR 0006 — Contract axes and Figma visual-state axes are recorded separately

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** julian
- **Tags:** components, figma, governance
- **Related:** [ADR 0004 — A state declares who may set it, and prop names are generated from that](./0004-a-state-declares-who-may-set-it-and-props-are-generated-from-that.md)

## Context

Figma variant properties do not all describe component inputs. The measured `TabItem` candidates in
the current source use a `State` property for resting, interaction, selection and disabled
appearances; the inventory and unresolved divergences are recorded in
`.claude/skills/ds-figma-component/references/figma-file.md`. The repository's proposal guidance
also records that existing Figma files commonly flatten runtime states, authored states, content and
actual props into the same variant mechanism.

The component contracts keep those facts separate. `axes` describes authored dimensions such as
size or hierarchy. `states` describes runtime or authored state, and `states.*.control` determines
whether a framework emits a public input. That means a Figma `State` property cannot truthfully be
copied into the contract-axis map, but dropping it would also make the map incomplete as a record of
the Figma set.

The tension is between preserving what Figma actually contains and preventing a design-only review
mechanism from becoming a component API by accident.

## Decision

1. A Figma variant property is recorded as a contract axis only when it corresponds one-to-one with
   an axis declared by the component contract, including the same value set.
2. A Figma-only property used to display visual states is recorded separately from contract axes.
   Its values must be declared contract states, enumerated values of those states, or the resting
   value `default`. Whether a state produces a public framework input does not change this
   classification.
3. Content selectors and every other non-contract variant property are divergences. They are not
   reclassified as visual-state axes to make reconciliation pass.
4. A reconciled component entry identifies its contract, and a plain Figma component cannot
   reconcile a contract that declares axes; that contract requires a component set capable of
   representing them.
5. Offline verification checks the recorded map against the component contract. It does not prove
   that the live Figma node still matches the record, so an entry is added only after live
   reconciliation and may still drift later.

## Contract

| Concern                         | Where                                                               |
| ------------------------------- | ------------------------------------------------------------------- |
| Component-map schema            | `.figma/schema/components.schema.json`                              |
| Figma conventions               | `.figma/manifest.json` -> `identity.variantConventions`             |
| Authoring and reconciliation    | `.figma/README.md` and `.claude/skills/ds-figma-component/SKILL.md` |
| Current measured evidence       | `.claude/skills/ds-figma-component/references/figma-file.md`        |
| Component contract state model  | `packages/contracts/schema/component.schema.json` and ADR 0004      |
| Enforcement                     | `scripts/verify-figma.mjs` (`pnpm verify:figma`, gated in CI)       |
| Enforcement regression coverage | `scripts/verify-figma.test.mjs` (`pnpm test`)                       |

## Consequences

**Positive**

- The component API remains canonical even when Figma uses variants to preview interaction states.
- The map can preserve a measured visual-state property without inventing a `state` prop.
- Contract identity, missing axes and invalid state values fail in CI instead of surviving as
  plausible reconciliation metadata.

**Negative / trade-offs**

- A single visual-state property flattens states that can coexist at runtime, such as selected and
  focus-visible. It is a review aid, not a complete state-space model.
- Legacy Figma sets that use variants for content cannot be marked reconciled until that divergence
  is removed or a later decision defines another representation.
- The offline gate trusts the recorded Figma facts. A live edit can make the map stale without
  failing CI; a fresh live read is still required before relying on a mapping.

## Alternatives considered

**Record every Figma variant property as a contract axis** — rejected because it turns hover,
focus, selection and content choices into public component inputs even when the contract explicitly
does not expose them.

**Discard every non-contract variant property from the map** — rejected because the map would stop
recording the actual shape of the reconciled Figma set and could not distinguish a deliberate visual
state property from an unmeasured omission.

**Expand each runtime state into an independent Figma axis** — rejected as a mapping rule. It models
coexisting states more accurately, but rewrites the measured Figma source instead of recording it.
That may be a useful generation strategy, but it is a separate decision from reconciliation.
