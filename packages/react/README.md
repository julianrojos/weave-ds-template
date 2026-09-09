# `@juro/react`

The React **backend**. One of potentially several.

**It exports no components, and that is now permanent rather than a starting state.** A component is
generated into a consumer's own repository from a contract in `@juro/contracts`, and belongs to them
from that moment. This package holds the things that make that generation possible.

## What is here

| Path                                        | Holds                                                          | State     |
| ------------------------------------------- | -------------------------------------------------------------- | --------- |
| [`bindings/`](./bindings/README.md)         | one React binding per contract, plus the schema governing them | **built** |
| [`src/emit/`](./src/emit/README.md)         | the emitter: contract + binding → component source             | spike     |
| [`src/behavior/`](./src/behavior/README.md) | interaction primitives emitted components import               | **built** |
| `prop-bindings.json`                        | where React's idiom differs from the agnostic vocabulary       | **built** |
| [`scripts/`](./scripts/README.md)           | contract composer, gates, generators and reports               | **built** |
| `src/index.ts`                              | package root; behavior is exported through `./behavior`        | **built** |

## The one place the "no runtime" rule bends

Emitted components **import** their interaction primitives from `src/behavior/` rather than having
them copied in. So this package will ship real JavaScript, and consumers will have a runtime
dependency on it.

```
what you can see, you own.             markup, structure, theme
what must be correct, you depend on.   focus, keyboard, selection
```

A roving-tabindex bug copied into two hundred repositories is two hundred fixes. The full argument,
including the honest objection to it, is in [`src/behavior/README.md`](./src/behavior/README.md).

No `./behavior` export subpath is declared yet, deliberately: an `exports` entry pointing at a file
that does not exist is a runtime failure that nothing in this repo would catch.

## Consuming it

The emitter is still an explicitly named spike rather than a supported package CLI. It can generate
a component into a consumer directory directly:

```bash
node packages/react/src/emit/emit.mjs Switch --out <dir>
```

The sandbox components were produced through that path. Packaging it as an installable command and
adding consumer-repository regeneration checks remain separate work.

## Styling what it emits

Class names are hashed by CSS Modules and are not a public surface. Target the **part attributes** —
stable, semantic, and the thing the library actually promises:

```css
.myToolbar [data-juro-part='label'] {
  letter-spacing: 0.02em;
}
```

The library is **unstyled**. An emitted component arrives with a token-free `structure.css` that
holds the layout its contract's promises depend on, and an empty `theme.css` listing one commented
socket per unbound channel. Wiring those sockets to a token system is the consumer's job;
`@juro/tokens` is one worked example of doing it, not a dependency.

## Working on it

Read [`CLAUDE.md`](./CLAUDE.md) for library internals. The authoring contract split when this package
stopped holding components:

| You are about to                | Read                                                 |
| ------------------------------- | ---------------------------------------------------- |
| Author or change a contract     | `packages/contracts/components/README.md`            |
| Write or change the emitter     | [`src/emit/README.md`](./src/emit/README.md)         |
| Implement a behaviour primitive | [`src/behavior/README.md`](./src/behavior/README.md) |
| Write a React binding           | [`bindings/README.md`](./bindings/README.md)         |

## Current verification boundary

`verify:contract` now treats contracts as the population and validates all fifteen against their
React bindings, cross-contract relationships and platform claims. It does not compare generated TSX
with its source contract: that would check an output against the input that produced it. A consumer
that commits generated components still needs a regeneration check around its chosen output path.
