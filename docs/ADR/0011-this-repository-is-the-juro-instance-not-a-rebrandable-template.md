# ADR 0011 - This repository is the Juro instance, not a rebrandable template

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** julianrojos
- **Tags:** repository, identity, ci, governance
- **Related:** [ADR 0005 - Code identity owns token naming](./0005-code-identity-owns-token-naming.md)

## Context

The repository began as a generic starter and included a one-shot `init-ds` codemod plus a CI matrix
that tested renaming the generic identity. Commit `1146821` deliberately initialized the checkout as
`juro`. Since then it has acquired measured tokens, project ADRs, fifteen component contracts and
generated component implementations.

The old template surface remained visible after initialization. Documentation still instructed new
users to run `init-ds`, while the command correctly refused because the repository was already
branded. The separate CI matrix therefore failed before reaching any project gate.

Treating `juro` as a new placeholder would make a completed initialization indistinguishable from a
fresh template and would turn a one-shot codemod into an unsupported migration tool.

## Decision

1. This repository is the Juro design-system instance. Its configured package, token and data
   prefixes are project identity, not placeholders.
2. The `init-ds` command, implementation and CI matrix are removed. Rebranding an established
   instance is a migration requiring its own plan; it is not a supported repository command.
3. `ds.config.json` remains canonical for machine-readable identity. Verification continues to
   reject disagreement between it and the Figma manifest.
4. CI validates the current instance from a clean checkout. It does not claim to validate a separate
   pristine template.
5. Any future reusable starter is maintained and tested as a separate artifact rather than inferred
   from this instance.

## Contract

| Concern              | Where                                                         |
| -------------------- | ------------------------------------------------------------- |
| Canonical identity   | `ds.config.json`                                              |
| User entry point     | `README.md`                                                   |
| Agent entry point    | `CLAUDE.md`                                                   |
| CI surface           | `.github/workflows/verify.yml`                                |
| Identity consistency | `scripts/verify-figma.mjs` (`pnpm verify:figma`, gated in CI) |

## Consequences

**Positive**

- The quick start and CI describe commands that can actually succeed in this checkout.
- `juro` has one meaning: the identity of this design system.
- A dangerous repository-wide rename cannot be mistaken for routine setup.

**Negative / trade-offs**

- Consumers cannot clone this repository and rename it with one supported command.
- Reusing the machinery requires extracting a separately governed starter or performing an explicit
  migration.
- Historical documents may still discuss the generic origin where that context explains an earlier
  decision, but operational instructions must describe the Juro instance.

## Alternatives considered

**Allow `init-ds` to rename from `juro`.** Rejected because it reclassifies a real project identity
as a placeholder and applies a pre-component operation to an established system.

**Run the rename matrix against another branch or tag.** Rejected because this repository's CI would
then validate code other than the checkout that triggered it. A reusable starter needs its own
versioning and CI boundary.

**Keep the dead command for historical reference.** Rejected because a command exposed in
`package.json` and the quick start is an operational promise, not documentation of history.
