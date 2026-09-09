# `schema/`

The schemas that govern what a component **is**.

| File                                               | Governs                                                                        | Agnostic? |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | --------- |
| [`component.schema.json`](./component.schema.json) | What the component is: purpose, behaviour, states, axes, anatomy, token policy | **yes**   |

`react-binding.schema.json` used to sit beside this one. It moved to
`packages/react/bindings/binding.schema.json`, because a schema with `"framework": {"const": "react"}`
in it is a React artifact and this package may not hold one.

`behavior.schema.json` — the interaction vocabulary — is planned and does not exist. See the parent
README's "Not built yet".

## Where a field goes

> **If it would still be true in React Native, it belongs in the contract.**

| Fact                         | Where                 | Why                                                                  |
| ---------------------------- | --------------------- | -------------------------------------------------------------------- |
| "this means _button_"        | contract              | `<button>` and `Pressable` are the same meaning                      |
| "this renders `<button>`"    | binding               | there is no `<button>` in React Native                               |
| "it has a `label` region"    | contract              | every platform has one                                               |
| "the ref lands on `root`"    | binding               | refs are a React idea                                                |
| "hover must dim it"          | contract              | every platform has _some_ pressed/hover treatment                    |
| "background is a fill token" | **neither, any more** | the library is unstyled; the channel is named, the source is unbound |

A binding that grows past a handful of fields is usually a sign something agnostic leaked into it.

## Why the contract specifies rather than merely describes

The earliest version of this schema held only what code could not state, and forbade restating
anything derivable — because two copies of one fact drift. That rule bought safety and cost
buildability: a file that deliberately omits the axes and their values cannot be the thing you build
_from_, only a thing that annotates something already built.

The library therefore inverted the relationship: the contract is primary and code is emitted from
it. Under that model:

- **The contract must state the rules a component is compiled from** — but not its props. A prop name
  is a framework's spelling, so the contract states that a state is `shared` and each binding
  compiles that into `checked`/`defaultChecked`/`onCheckedChange`, or into `modelValue` +
  `update:modelValue`, or into an attribute and an event. See `states.*.control` and
  [ADR 0004](../../../docs/ADR/0004-a-state-declares-who-may-set-it-and-props-are-generated-from-that.md).
- **Generated code cannot be an independent second opinion.** Comparing it with the contract that
  produced it is circular. A repository that commits generated output needs a regeneration check:
  re-emit to the chosen destination, compare and fail on a difference. That is an integration
  concern because `theme.css` becomes consumer-owned after its first emission.

`control` landed with ADR 0004 and `$id` is `component-contract-3.json`. `verify:contract` now checks
the authored graph directly: schemas, binding pointers, collection membership, cross-component
references, platform state claims and conformance commitments. It intentionally makes no parity
claim against generated TSX.

## Reading a schema

Both files are JSON Schema draft 2020-12 with `additionalProperties: false` at every level, so an
unrecognised key is an error rather than a silent no-op. `pnpm verify:contract` compiles them on
every run before validating every contract and React binding in the repository.
