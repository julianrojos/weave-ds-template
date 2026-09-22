# ADR 0007 — A part requests an action it cannot perform

- **Status:** Draft
- **Date:** 2026-09-21
- **Deciders:** julianrojos
- **Tags:** components, a11y, governance
- **Related:** [ADR 0004 — A state declares who may set it and props are generated from that](./0004-a-state-declares-who-may-set-it-and-props-are-generated-from-that.md), [ADR 0005 — Unsupported contract claims are non-conforming](./0005-unsupported-contract-claims-are-non-conforming.md)

## Context

The imported `Tag` design carries a remove control — a 16 × 16 instance named `X`, present in all
twenty variants, always the same component, in the same position, with no component properties. It
is fixed anatomy rather than consumer-supplied content, so it is a declared part, not a slot. The
measurement is in [`.ai/maps/proposals/Tag.md`](../../.ai/maps/proposals/Tag.md) §1.

**The schema cannot express what activating it does.** `anatomy.*.activates` offers exactly two
shapes, `toggles` and `between`, and all five existing uses are genuine toggles: `checked` on
Checkbox and Switch, `open` on AccordionItem, `member` on TabItem and RadioItem. Removing a tag is
not reversible: pressing the control again is impossible, because the thing that carried it is gone.

**Modelling removal as a state the part toggles would be a lie about ownership, not only about
reversibility.** A tag cannot remove itself from a list; only whoever owns the list can. A
`removed` state with `control: shared` would compile to a public input a consumer could set to
`true`, claiming a removal the owner never performed — the same class of error ADR 0004 exists to
prevent, where the wrong `control` value produces a component that works and is missing, or
inventing, an API.

So the component needs to say something it currently has no vocabulary for: _this part asks; someone
else acts_.

## Decision

1. **`activates` gains a third shape, `requests`, naming one action the part asks its consumer to
   perform.** `"activates": { "requests": "remove" }` is the `Tag` case.
2. **`requests` means the component does not perform the action and cannot observe whether it
   happened.** It carries no state, sets nothing, and reads nothing back. A contract that needs the
   outcome must declare a state for it separately and say who controls it.
3. **`requests` is exclusive with the toggling pair, which stays as it is.** A part either toggles a
   state it owns — `toggles`, optionally with `between` — or it requests an action it does not own.
   Never both. `between` continues to require `toggles`, because it names which two of that state's
   values a user may move between; `Checkbox` already declares the pair and remains legal.
   Activation still resolves to _"one named thing"_, which is what keeps this schema from becoming a
   programming language.
4. **Each backend compiles `requests` into one native request channel by rule, not by per-component
   mapping** — a callback prop in React, an emitted event in Vue and Angular, and a composed custom
   event in Web Components. No contract names a prop or event, and adding a component that uses
   `requests` adds no mapping work.
5. **React's callback is REQUIRED**, unlike a state's `on…Change`; emitted events remain optional to
   listen for. The difference is the primitive, not a preference: a toggling callback notifies —
   `Dialog` owns `open`, so without `onOpenChange` the dialog still opens and closes and only the
   outside is uninformed. A request owns nothing, so without its callback the control is not
   under-reported, it is inert. A focusable, named button that provably does nothing should not
   typecheck. Where a backend cannot express a required event — Vue, Angular and Web Components
   emit events, which are always optional to listen for — that is a gap to report under ADR 0005,
   not a reason to weaken the rule for the backend that can.
6. **A part carrying `requests` is interactive, and the contract must say so.** It declares its own
   `role`, the consumer supplies its accessible name, and the component declares `a11y.minHitArea`.
   This does not make its **container** an action: `hierarchy` still does not apply, per
   [ADR 0006](./0006-paint-prominence-is-its-own-axis-not-a-hierarchy.md).
7. **A backend that cannot emit it reports non-conformance** under ADR 0005 rather than silently
   omitting the control or weakening it to a non-interactive element.

## Contract

| Concern                   | Where                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| The `activates` shapes    | `packages/contracts/schema/component.schema.json` → `$defs.part`                                            |
| Shared contract reading   | `packages/emit-web/contract.mjs`                                                                            |
| Per-backend prop rules    | `packages/react/bindings/`, `packages/vue/bindings/`, `packages/angular/bindings/`, `packages/wc/bindings/` |
| Enforcement               | `packages/react/scripts/verify-contract.mjs` (`pnpm verify:contract`, gated in CI)                          |
| Decision 6, the role half | `packages/contracts/schema/component.schema.json` → `$defs.part.allOf`                                      |
| Decision 6, the hit area  | `packages/react/scripts/verify-contract.mjs` — `a11y` and `anatomy` are too far apart for the schema        |
| Non-conformance reporting | `scripts/relationship-conformance.mjs` → `requestConformance`, surfaced by `pnpm verify:parity`             |
| Cross-backend agreement   | `pnpm verify:parity`                                                                                        |
| The measurement behind it | [`.ai/maps/proposals/Tag.md`](../../.ai/maps/proposals/Tag.md) §1, §9                                       |

## Consequences

**Positive**

- A component can expose an affordance for something it does not own, which is the common case for
  anything removable, dismissible or submittable from inside a list.
- Ownership stays explicit. `control` says who may set a state; `requests` says who performs an
  action. Neither is inferred from a prop name.
- The alternative modelling — a `removed` state — would have put a settable input on every backend
  for a fact the component cannot know. That API never ships.

**Negative / trade-offs**

- **The schema grows a third activation shape**, and three is the number at which a reader starts
  needing the table rather than remembering it.
- **It admits a whole family of future requests** — `copy`, `retry`, `expand` — with no rule yet for
  when a request deserves a named primitive rather than being the consumer's own button in a slot.
  Tag's X earned it by being fixed anatomy in twenty of twenty variants; nothing states that
  threshold.
- **Four backends must implement it before any contract using it is emittable.** Unlike Avatar's
  `derivedFrom`, there is no platform capability to plead: every target can expose a request
  channel, so non-conformance here would be unfinished work rather than an honest platform gap.
- **How it will fail quietly:** nothing can check that a `requests` name means anything. A contract
  could declare `requests: "remove"` and a consumer wire its callback or event to something
  unrelated; the request fires, every gate is green, and the contract's promise is decoration. The
  name is a claim no gate can verify — the same class as `intent.purpose` and every a11y claim.

## Alternatives considered

**Declare a `removed` state and use `activates: { toggles: "removed" }`.** Rejected: it compiles to
a settable input for a fact the component cannot observe, and `toggles` describes a reversible change
that this is not. It would have been the cheapest change and the least true one.

**Model the control as a slot the consumer fills.** This was the earlier choice here, on the analogy
of `Dialog`'s `actions` slot, and it was withdrawn on measurement: `Dialog`'s slot holds arbitrary
consumer content that varies per use, while the X is one fixed affordance present in twenty of twenty
variants. A slot would also have moved the accessible name and the hit area out of the contract's
reach, and the design already fails the repository's hit-area floor — see `Tag.md` §8.1.

**A general event list on a part.** Rejected for the reason the schema already states about
`activates`: the moment it takes an expression rather than one named thing, the contract has become
a programming language and stops being something a second backend can be checked against.
