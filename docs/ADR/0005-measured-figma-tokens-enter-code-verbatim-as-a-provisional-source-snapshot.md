# ADR 0005 — Measured Figma tokens enter code verbatim as a provisional source snapshot

- **Status:** Accepted
- **Date:** 2026-09-10
- **Deciders:** julian
- **Tags:** tokens, figma, governance
- **Related:** [ADR 0001 — Every layer is self-describing, and context is pulled rather than pushed](./0001-every-layer-is-self-describing.md)

## Context

The current Figma source has 154 local variables across six collections. The measurement is in
[Research 0003](../research/0003-figma-token-source-inventory.md), and the correspondence is
recorded in `.figma/maps/tokens.json`.

The source is not clean token policy. It mixes scale vocabularies (`space/0`, `radius/m`,
`border/thin`), contains non-kebab segments (`selectedBg`, `fontFamily`), carries component-like
global names (`control/waveform`, `UI/Button/*`), and stores opacity in Figma's `0..100` unit while
CSS opacity uses `0..1`.

Those defects create the decision: either normalize before any token source exists, or import the
measured source exactly and make the defects visible enough that later normalization is deliberate.
Normalizing first would create a nicer token layer, but it would no longer answer the immediate
question "are all Figma variables represented in the repository?"

## Decision

1. The first code token source is a **measured Figma snapshot**, not the final token vocabulary.
2. Every measured Figma variable is represented in DTCG source under `packages/tokens/tokens/`.
   Source names are preserved as measured, including known defects such as `selectedBg`,
   `fontFamily`, mixed scale vocabularies and product-specific role names.
3. `.figma/maps/tokens.json` records the variable -> DTCG correspondence for the snapshot.
   `variableId` and `variableKey` may be `null` while the Figma file is unpublished; the dotted
   code path is the stable join inside this repo.
4. Opacity DTCG values use CSS-ready numbers in the `0..1` range. The original Figma `0..100` value
   is preserved in `$description`.
5. No new authored token may copy the snapshot's known defects as precedent. Any rename,
   vocabulary normalization, scope cleanup or component-token extraction needs a follow-up ADR or
   an update to this record before v0.

## Contract

| Concern                          | Where                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| Source token files               | `packages/tokens/tokens/*.json`                                                     |
| Figma variable correspondence    | `.figma/maps/tokens.json`                                                           |
| Figma collection -> source files | `.figma/manifest.json` -> `identity.variableCollections`                            |
| Source inventory                 | `docs/research/0003-figma-token-source-inventory.md`                                |
| Build output                     | `packages/tokens/style-dictionary.config.mjs` (`pnpm build:tokens`)                 |
| Enforcement                      | `scripts/verify-figma.mjs` (`pnpm verify:figma`) and Prettier (`pnpm format:check`) |

## Consequences

**Positive**

- The repository can answer whether every measured Figma variable is represented: yes, 154 of 154.
- The generated CSS and TypeScript outputs are immediately usable by consumers of `@ds/tokens`.
- The Figma map, manifest and token source agree on the same measured source file and collection
  split.
- Known naming and scale problems stay visible instead of being silently corrected in one direction.

**Negative / trade-offs**

- The generated CSS contains provisional names such as `--ds-interactive-selected-bg`,
  `--ds-font-font-family-primary`, `--ds-space-0`, `--ds-radius-m` and `--ds-border-thin`.
- `pnpm verify:figma` validates schema shape and code paths, but it does not enforce token policy.
  A semantically poor but well-formed snapshot still passes.
- Opacity uses the code representation, not the raw Figma value. That is useful for CSS, but it is
  still a unit conversion that future tooling must preserve consciously.
- If Figma is renamed later, this snapshot can drift unless the source is re-measured and the map is
  updated.

## Alternatives considered

**Normalize before import** — rejected for this step. It would produce cleaner code tokens, but the
repo would lose a one-to-one answer to "which Figma variables exist in code?" and every rename would
need to be justified before the inventory itself existed.

**Keep opacity as `5..100` in DTCG** — rejected because CSS opacity and common runtime APIs consume
`0..1`, and the Figma variables themselves describe the intended code values. Keeping `5..100`
would make the generated output surprising at every use site.

**Leave the source empty until every token decision is settled** — rejected because it keeps the
repo unable to test the token pipeline against the real source. Empty is an honest starter state,
not a useful state once the source has been measured.
