# ADR 0005 - Code identity owns token naming

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** julianrojos
- **Tags:** tokens, figma, naming, governance
- **Related:** [ADR 0006 - Dimension families keep their measured scale vocabularies](./0006-dimension-families-keep-their-measured-scale-vocabularies.md), [ADR 0011 - This repository is the Juro instance, not a rebrandable template](./0011-this-repository-is-the-juro-instance-not-a-rebrandable-template.md)

## Context

[Report 0003](../research/0003-figma-token-inventory.md) measured three conflicting identities:
Figma `codeSyntax.WEB` uses `weave-ds-*`, `.figma/manifest.json` still recorded `ds`, and
`ds.config.json` records `juro`. The same report found one camelCase variable path,
`interactive/selectedBg`, in an otherwise slash-separated lowercase vocabulary.

The file name and the token path also answer different questions. `color.palette.json` says where a
primitive is maintained; making `palette` part of every token path would expose storage structure as
public API.

## Decision

1. `ds.config.json` is the sole authority for package, CSS custom-property and data-attribute
   identity. Figma `codeSyntax.WEB` is observed metadata and never supplies the code prefix.
2. DTCG paths use lowercase dot-separated groups and kebab-case segments. A Figma slash path maps to
   that syntax with semantic words preserved; `selectedBg` therefore maps to `selected-bg`.
3. File names do not become token-path segments. A primitive stored in `color.palette.json` has a
   path such as `color.purple.500`, not `color.palette.purple.500`.
4. Verification keeps `ds.config.json` and `.figma/manifest.json` identity fields in lockstep and
   rejects disagreement between them. Rebranding policy is governed separately by ADR 0011.

## Contract

| Concern                      | Where                                                               |
| ---------------------------- | ------------------------------------------------------------------- |
| Canonical identity           | `ds.config.json`                                                    |
| Token naming rules           | `packages/tokens/tokens/README.md`                                  |
| Generated CSS names          | `packages/tokens/style-dictionary.config.mjs` (`pnpm build:tokens`) |
| Figma-to-code correspondence | `.figma/manifest.json`, `.figma/maps/tokens.json`                   |
| Identity enforcement         | `scripts/verify-figma.mjs` (`pnpm verify:figma`, gated in CI)       |

## Consequences

**Positive**

- A token has one code name even when Figma exposes a different Dev Mode syntax.
- Moving a token between source files does not rename its public custom property.
- The only observed camelCase path is normalized without renaming the Figma variable in place.

**Negative / trade-offs**

- Figma names and code paths are not always mechanically interchangeable.
- Every normalization must be recorded in the map; an omitted entry leaves intentional drift.
- A future decision to adopt Figma's `weave-ds-*` syntax would require a deliberate identity
  migration, not a local token edit.

## Alternatives considered

**Use `codeSyntax.WEB` as the canonical token name.** Rejected because it conflicts with the
repository's configured identity and would make a downstream Figma field authoritative over code.

**Include `palette` and `semantic` in DTCG paths.** Rejected because those words describe source-file
organization, not consumer intent, and would leak an implementation detail into every CSS name.
