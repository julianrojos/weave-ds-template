# Architecture Decision Records (ADRs)

Each ADR captures one architecturally significant decision: its context, the decision, and its
consequences. ADRs are immutable once **Accepted** — to change a decision, supersede it with a new
ADR rather than editing the old one.

**An ADR records the decision and stays agnostic; it does not restate the specifics that realize
it.** Those specifics — schemas, scripts, generated files, code snippets, or reference docs — are
the decision's **contracts**, and they live with the code they govern. An ADR _links_ its
contracts in a `## Contract` table; it does not inline them. The shape is in
[`0000-template.md`](./0000-template.md). This is deliberate: contracts evolve with the
implementation, so keeping them out of the record is what lets an Accepted ADR stay stable instead
of being rewritten every time the details move.

**Statuses:** `Draft` → `Proposed` → `Accepted` → (`Superseded by NNNN` | `Deprecated`)

**Pre-v0 status policy.** Until the first release there is nothing downstream to protect, so the
immutability rule above is not yet in force — ADRs are edited in place and most stay **Draft**,
because decisions can still move. Only foundational decisions **already mechanized in code** are
**Accepted**. At v0 the Accepted-is-immutable / supersede-don't-edit discipline switches on for
good.

That bar is worth stating plainly, because it is the one that keeps this folder honest: _a
decision nobody has implemented is a Draft, however confident it sounds._

## The records

The base template starts almost empty, like `docs/research/`, `.ai/maps/proposals/` and
`packages/contracts/components/`: it provides decision machinery, not an inherited token strategy.
This working repository now also contains the project decisions derived from its measured design
source.

**0001 describes how the repository is organised** and is inherited with the template. Later records
belong to the system being built here; each points to the local contract that makes the decision
real. Details settled mechanically remain documented next to the code that enforces them:

| What                                                  | Where                                     |
| ----------------------------------------------------- | ----------------------------------------- |
| What a component contract may contain, and why        | `packages/contracts/schema/README.md`     |
| How to author a component, and the gates it must pass | `packages/contracts/components/README.md` |
| Token naming and tiers                                | `packages/tokens/tokens/README.md`        |
| What Figma is, and what it is not                     | `.figma/README.md`                        |

> **The table below is generated** by `pnpm adr-index` from the records themselves — the number from
> the filename, the title from the H1, the status from each record's `Status:` line. Do not edit it
> by hand; `pnpm adr-index:check` fails the build when it drifts. That is also why a record's status
> is only ever changed **in the record**.

<!-- adr-index:start -->

| #                                                                                   | Title                                                                    | Status   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| [0001](./0001-every-layer-is-self-describing.md)                                    | Every layer is self-describing, and context is pulled rather than pushed | Accepted |
| [0002](./0002-agnostic-contracts-live-in-their-own-package.md)                      | Agnostic contracts live in their own package, not at the repo root       | Draft    |
| [0003](./0003-paints-name-the-channel-and-leave-the-source-unbound.md)              | A paint names the channel and leaves its source unbound                  | Draft    |
| [0004](./0004-a-state-declares-who-may-set-it-and-props-are-generated-from-that.md) | A state declares who may set it, and prop names are generated from that  | Draft    |
| [0005](./0005-code-identity-owns-token-naming.md)                                   | Code identity owns token naming                                          | Accepted |
| [0006](./0006-dimension-families-keep-their-measured-scale-vocabularies.md)         | Dimension families keep their measured scale vocabularies                | Accepted |
| [0007](./0007-opacity-is-composed-separately-from-color.md)                         | Opacity is composed separately from color                                | Accepted |
| [0008](./0008-global-color-roles-preserve-the-measured-semantic-families.md)        | Global color roles preserve the measured semantic families               | Accepted |
| [0009](./0009-component-specific-values-stay-out-of-the-global-token-package.md)    | Component-specific values stay out of the global token package           | Accepted |
| [0010](./0010-web-compiles-color-and-opacity-roles-into-derived-paints.md)          | Web compiles color and opacity roles into derived paints                 | Accepted |
| [0011](./0011-this-repository-is-the-juro-instance-not-a-rebrandable-template.md)   | This repository is the Juro instance, not a rebrandable template         | Accepted |

<!-- adr-index:end -->

## Adding an ADR

1. Copy [`0000-template.md`](./0000-template.md); number it sequentially (`NNNN-kebab-title.md`).
2. Start at **Draft**; promote as the decision firms up and lands in code. The status lives in the
   record and nowhere else.
3. Run **`pnpm adr-index`**, and commit the regenerated table. Never edit it by hand.

`pnpm adr-index:check` fails the build if you skip step 3 — an ADR that is not in the index does not
exist, because nobody browses a directory listing.

The `ds-decide` skill does all three, and will refuse to bundle two separable decisions into one
record.

## What belongs here, and what does not

|                                                        | Goes in          | Why                                                                     |
| ------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------- |
| "We will namespace every custom property"              | `docs/ADR/`      | A decision. Changing it later has consequences worth tracing.           |
| "The Figma file has 41 variables across 3 collections" | `docs/research/` | A measurement. It has no consequences; it is evidence _for_ a decision. |
| The JSON Schema that enforces the decision             | next to the code | A contract. It moves with the implementation.                           |

`docs/research/` is the **pre-decision** space and `docs/ADR/` is the **post-decision** space. A
research document ends in open questions; an ADR answers one of them.

## Writing one that is worth reading

- **One decision per record.** If the draft contains two "we will" sentences that could be argued
  separately, it is two ADRs.
- **Context is evidence, not narrative.** Prefer a measured number to an adjective. "The manifest
  is 1.79 MB, so reading it to answer a question about one component is not viable in a context
  window" is context; "the manifest is quite large" is not.
- **Consequences must include real negatives.** An ADR with only positives was not a decision, it
  was an announcement. Name what this costs, what it forecloses, and what will go wrong quietly.
- **Alternatives considered** are only worth writing where someone would genuinely have chosen
  differently. Do not pad.
