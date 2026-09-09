# `scripts/`

Repo-wide scripts — the ones that operate on the whole repository rather than on one package.

Package-specific machinery lives beside its package:
[`packages/react/scripts/`](../packages/react/scripts/README.md) holds everything that reads or
checks component source.

Every script here is plain Node with no build step, run through a `pnpm` alias. Each one carries a
header comment saying **what it catches that nothing else would** — that is the test for whether it
earns a place in `pnpm verify`.

## What is here

| Script                                     | Command                                   | Kind      | What it is for                                                                               |
| ------------------------------------------ | ----------------------------------------- | --------- | -------------------------------------------------------------------------------------------- |
| [`verify-docs.mjs`](./verify-docs.mjs)     | `pnpm verify:docs`                        | **gate**  | Every link, path and `pnpm` command named in the docs resolves                               |
| [`verify-tokens.mjs`](./verify-tokens.mjs) | `pnpm verify:tokens`                      | **gate**  | DTCG paths, aliases, semantic indirection and color/opacity pairs follow the token contracts |
| [`adr-index.mjs`](./adr-index.mjs)         | `pnpm adr-index` / `pnpm adr-index:check` | generator | The ADR index, derived from the records themselves                                           |
| [`verify-figma.mjs`](./verify-figma.mjs)   | `pnpm verify:figma`                       | **gate**  | `.figma/maps/*.json` validate against their schemas, and claim no code path they lack        |

## The rule these follow

A gate belongs here when its breach **produces no error anywhere else**. A malformed `.figma` map
breaks no build. A link pointing at a deleted file renders fine. A missing ADR row leaves every tool
green. That invisibility is the entire justification — a check for something the compiler already
catches is noise.

The corollary, learned the expensive way: **a gate must run in CI, not only in `pnpm verify`.** A
contract enforced only by `verify` is enforced on whichever machine happens to run it. See
[`.github/workflows/`](../.github/workflows/README.md).
