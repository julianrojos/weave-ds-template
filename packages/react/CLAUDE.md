# CLAUDE.md — `@juro/react`

**The authority for library internals.** The root `CLAUDE.md` covers the monorepo, the token
pipeline and the governance layer; this file covers authoring components and the contract system.
Where the two disagree, this one wins for anything under `packages/react/`.

> [!IMPORTANT]
>
> **Contract-first backend.** This package no longer authors components under `src/components/`.
> Contracts in `packages/contracts/components/` are the source; React bindings complete the
> backend-specific choices, and the emitter generates component code into a consumer repository.
>
> The old source-extraction readers are gone. `verify:contract` validates the authored contract
> graph and bindings; it does not claim that generated output is an independent second opinion.
>
> New territory has its own docs: [`README.md`](./README.md) routes to the emitter rules, the
> behaviour primitives and the bindings.

## Commands

```bash
pnpm contract <Name>       # compose one component's merged view. No build needed.
pnpm contract --coverage   # who is contracted and who is not
pnpm verify:contract       # the contract gate (also in CI)
pnpm prop-map              # regenerate the prop glossary
pnpm prop-map:check        # assert it is current + no stale disposition (also in CI)
pnpm report:paints         # token policy vs stylesheet — REPORT, never a gate
pnpm build:react           # Vite lib mode -> ESM + CJS + .d.ts + one stylesheet
pnpm typecheck
```

Which of those are gates and which are reports is not a detail — see [Enforcement](#enforcement).

## A React component is described by a contract and a binding

**The contract (`<Name>.contract.json`) is agnostic and authoritative.** It owns intent, states,
axes, anatomy, accessibility commitments, slots, lifecycle status and paint channels.

**The React binding (`<Name>.react.json`) supplies backend choices** such as the rendered element,
ref target, `className` target and prop-name overrides. The prop surface is derived from these
authored inputs with the same helper used by the emitter. The full boundary is in
`packages/contracts/schema/README.md`.

**Read them merged:** `pnpm contract Button`. Reading either alone is misleading.

`pnpm verify:contract` validates schemas, binding pointers, collection membership, cross-component
references, platform state claims and conformance commitments. It cannot use generated code to
prove its own input correct; output drift must be checked through regeneration where that output is
committed.

## Before adding a prop, read the prop map

[`.ai/maps/prop-map.md`](../../.ai/maps/prop-map.md) §1 is the axis registry. Reuse an axis and its
canonical values instead of coining a synonym. The canon is
[`packages/contracts/prop-canon.json`](../contracts/prop-canon.json) (data) and
[`packages/contracts/components/README.md`](../contracts/components/README.md) §2 (prose); the map measures reality
against it and **flags rather than blocks**, so nobody is stopped — which means somebody has to
look.

## The three invariants

Everything above depends on these. They are stated with their reasons in
[`packages/contracts/components/README.md`](../contracts/components/README.md) §3 and §5; in short:

1. A named node carries `data-juro-part="x"` **and** `className={styles.x}`, same name.
2. Every variant axis is a `cva` axis with a `defaultVariants` entry.
3. No generic wrapper around a variant type.

## Extraction is gone, and why it is not coming back

`scripts/extract/` held three readers that pulled prop types, `cva` axes and rendered parts out of
hand-written TSX. **Deleted 2026-09-03**, along with its `react-docgen-typescript` dependency.

It went because it had become unreachable rather than merely unused. Components are generated from
contracts into a consumer's repository, so there is no hand-written source here to read — and the
check it existed to serve, comparing a contract's axes against the code, is **circular** once the
code is derived from the contract. Repointing the prop map at the contracts removed its last
importer, and a file-scoped lint finds an unused import but never an orphaned module.

The cost of leaving it was concrete, not tidiness: `typescript` was tilde-pinned for the whole
monorepo solely to protect that one library from a silent regression, so **dead code was holding the
toolchain version hostage.** The pin is still there and its note now says the reason is gone.

The one use that would justify bringing it back: a consumer who HAND-EDITS their generated
components and wants drift against the contract detected. That is speculative, nobody does it, and
git has the code.

## Build output

Vite lib mode emits ESM + CJS + `.d.ts`, and **one prebuilt stylesheet** rather than runtime
`<style>` injection.

That is a deliberate consumer-facing choice: a downstream app may be an Electron renderer under a
CSP with no remote origins, whose bundler has a single global `.css` rule and no CSS-Modules
setup. A prebuilt stylesheet imports cleanly there; runtime injection and shipped `*.module.css`
do not. `package.json` keeps both a legacy `main`/`types` pair and an `exports` map for the same
reason — a consumer on classic Node resolution ignores `exports` entirely.

## Enforcement

| Runs                 | Gate or report | Catches                                                                  |
| -------------------- | -------------- | ------------------------------------------------------------------------ |
| `verify:contract`    | **gate**       | a contract that is illegal, invented, or contradicts the source          |
| `prop-map:check`     | **gate**       | a stale glossary or a disposition naming something that no longer exists |
| `typecheck`, `build` | **gate**       | the ordinary things                                                      |
| `report:paints`      | report         | a declaration that does not satisfy its declared token policy            |
| contract coverage    | report         | uncontracted components                                                  |

Two rules behind that split, both worth internalising:

- **A contract whose breach produces no build error has to be gated in CI, not only in
  `pnpm verify`** — otherwise it is enforced on whichever machine happens to run verify.
- **A gate that fails on everything on day one gets switched off, and a switched-off gate protects
  nothing.** That is why missing contracts and paint findings report rather than fail.
