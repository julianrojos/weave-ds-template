# Figma token source inventory

- **Date:** 2026-09-10
- **Source:** Figma source `weave` in `.figma/manifest.json`:
  `weave DS - Mokkap masterclass 29-08-2026 (Copy)`,
  `CAZybLope1cikvLyECBQnD`
- **Method:** Live Plugin API read of local variable collections, variables and aliases in the
  current source file. The read covered local Figma variables and text styles. It did not cover
  published library keys because the file is not published as a library, and it did not decide
  whether observed names are desirable token policy.

## What is there (measured)

The current source has 154 local variables across six collections:

| Collection           | Mode      | Variables | Types         | Observed tier |
| -------------------- | --------- | --------- | ------------- | ------------- |
| `Color Primitives`   | `Mode 1`  | 71        | COLOR         | primitive     |
| `Color Tokens`       | `Mode 1`  | 15        | COLOR         | token         |
| `Type Primitives`    | `Default` | 10        | FLOAT, STRING | primitive     |
| `Type Tokens`        | `Mode 1`  | 24        | STRING, FLOAT | token         |
| `Spacing Tokens`     | `Mode 1`  | 23        | FLOAT         | token         |
| `Opacity Primitives` | `Mode 1`  | 11        | FLOAT         | primitive     |

Every collection has exactly one mode. The Plugin API reports the mode names, not whether the mode
is semantically light, dark or something else.

`Color Tokens` are aliases into `Color Primitives`. The aliases include `surface/primary` ->
`color/gray/800-90`, `brand/primary` -> `color/purple/500`, and opacity-sensitive roles such as
`surface/overlay` that bind a solid color and expect opacity to be applied at the layer where the
token is used.

`Type Tokens` are aliases into `Type Primitives`. The eight local text styles use Lexend Deca and
bind font family, size and weight to variables.

`Spacing Tokens` contains three token families in one collection: `space/*`, `radius/*` and
`border/*`.

`Opacity Primitives` is authored in Figma's opacity unit: values are measured as `5, 10, 20, ...,
100`.

## What it appears to mean (inferred)

The collection names imply a two-tier model: primitive collections hold raw values, while token
collections hold roles and aliases intended for component and documentation bindings.

The Figma opacity values appear intended to compile to CSS opacity numbers in the `0..1` range.
That inference is supported by each opacity variable's own description, which says for example that
Figma value `5` is `0.05` in code.

The token names appear copied from a product UI, not from a generalized token architecture. Names
like `control/waveform`, `control/off`, `UI/Button/*` and `Display/Time/*` are usable source facts,
but they should not be treated as proof that the global namespace policy is settled.

## Problems found

The measured spacing collection mixes three scale vocabularies:

| Family   | Vocabulary                       |
| -------- | -------------------------------- |
| `space`  | numeric index: `0..9`            |
| `radius` | t-shirt-ish: `none/xs/s/m/...`   |
| `border` | descriptive: `none/thin/regular` |

The token README already says one dimension should not mix scale vocabularies. Importing these
names verbatim preserves the source truth, but it must not be read as a decision that the
vocabularies are acceptable.

`opacity/*` has two unit systems: Figma stores `5..100`, while CSS opacity consumes `0.05..1`.
Compiling these tokens requires choosing one code representation.

`color/gray/800-90` is not `color/gray/800` at 90% opacity. `color/gray/800` is `#232323`; the
measured `color/gray/800-90` value is `rgba(30, 30, 30, 0.9)`, i.e. `#1e1e1e` at 90%.

Some source names violate the local naming guidance: `interactive/selectedBg` is camelCase, and
`font/fontFamily/primary` preserves a compound camelCase segment.

## Open questions

- Should the canonical token vocabulary normalize source names before release, or should Figma be
  renamed first and re-measured?
- Should opacity source values be represented in DTCG as Figma percentages or as CSS-ready unit
  values?
- Should `border/*`, `radius/*` and `space/*` remain in one source file, or split by dimension once
  their scale vocabularies are decided?
- Which role families are global tokens, and which should move into component-local contracts?
