# `packages/react/scripts/`

The library's contract tooling: it composes authored contracts and React bindings, validates their
relationships, generates the prop glossary and reports on consumer-owned stylesheets.

Repo-wide scripts live in [`scripts/`](../../../scripts/README.md). These scripts stay here because
they implement the React backend over the agnostic contracts in
[`packages/contracts/components/`](../../contracts/components/README.md). They read contracts and
bindings on demand, with no build step.

## What is here

| Script                                         | Command                                 | Kind       | What it does                                                                  |
| ---------------------------------------------- | --------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| [`contract.mjs`](./contract.mjs)               | `pnpm contract <Name>`                  | composer   | Combines the contract, React binding and contract-derived prop surface        |
| [`verify-contract.mjs`](./verify-contract.mjs) | `pnpm verify:contract`                  | **gate**   | Validates schemas, pointers, relationships and platform claims                |
| [`build-prop-map.mjs`](./build-prop-map.mjs)   | `pnpm prop-map` / `pnpm prop-map:check` | generator  | Derives the prop glossary from contracts and compares it with the canon       |
| [`report-paints.mjs`](./report-paints.mjs)     | `pnpm report:paints`                    | **report** | Inspects hand-written component source when such source exists; never fails   |
| [`lib.mjs`](./lib.mjs)                         | —                                       | shared     | Deterministic readers, path helpers and composition shared by the other tools |

## Gate, generator, report — the distinction matters

- A **gate** exits non-zero. It is reserved for structural contradictions that produce no type or
  build error, such as an orphan binding or a cross-component reference to a missing contract.
- A **generator** writes a file and offers `--check` to assert it is current. Never hand-edit its
  output; the check discards the edit and reddens the build.
- A **report** prints and always exits zero. `report:paints` is one because a token-policy finding
  needs a human judgement, and **a gate that fails on everything on day one gets switched off.**

## Why nothing here is committed component metadata

The agnostic contract is the authored source. The React binding supplies backend-specific choices,
and `surface.mjs` derives the React prop surface from the same contract used by the emitter.
`contract.mjs` composes those inputs at read time instead of committing another manifest that could
go stale. See [`packages/contracts/schema/README.md`](../../contracts/schema/README.md).

This also defines the gate's limit: generated component code is not an independent source of truth.
Checking it against the contract that generated it would be circular. Consumer-owned output needs a
separate regeneration or integration check in the consumer repository.
