# ADR 0006 — Paint prominence is its own axis, not a hierarchy

- **Status:** Draft
- **Date:** 2026-09-21
- **Deciders:** julianrojos
- **Tags:** components, tokens, governance
- **Related:** [ADR 0003 — A paint names the channel and leaves its source unbound](./0003-paints-name-the-channel-and-leave-the-source-unbound.md)

## Context

The imported `Tag` design (node `4323:266`, measured in
[`.ai/maps/proposals/Tag.md`](../../.ai/maps/proposals/Tag.md)) carries a Figma axis literally named
`Variant` with values `Primary | Secondary`. Measured across all twenty variants, that axis changes
**nothing but the background and text colour**: geometry is 68 × 32 with padding 8 and gap 8 in every
one of them.

Three candidate homes exist and none is obviously right, which is what forces a record.

**`hierarchy` is the tempting answer and it does not fit.** The canon reserves it for _"how much
emphasis an action carries"_, adds _"actions have a rank; surfaces do not — so this axis is for
interactive components only"_, and says explicitly that it is _"distinct from a paint treatment"_.
Only `Button` uses it in this repository; `Dialog` holds real controls in its `actions` slot and does
not take the axis. A rank is also relational — Button's contract says a page holds one primary action
and everything else ranks below it — and twenty tags each marked `primary` assert nothing about each
other.

**The canon contradicts itself here, mildly, and that is why judgement was required.** The `variant`
entry glosses `hierarchy` as _"how much emphasis is applied"_, with no restriction; the `hierarchy`
entry restricts itself to actions and excludes paint treatments. Either sentence, read alone,
justifies a different answer.

**`variant` cannot absorb it.** `variant` is _"semantic intent, which selects the colour role"_, and
that is the design's other axis, `Scheme`. Within one scheme, `Primary`/`Secondary` selects which
member of that scheme's family is used — a second question that `variant` cannot also answer without
making `variant="secondary"` unable to say whether the tag is a danger or a brand.

The distinction is not about saturation, and not about token tier. Measured: Danger goes
`#ec221f` → `#fdd3d0`, Positive `#14ae5c` → `#cff7d3`, Warning `#e8b931` → `#fff1c2` — a tint of the
same hue. Brand goes `#2c2c2c` → `#f5f5f5`, a greyscale inversion, because
`Background/Brand/Secondary` **does not exist** in the source library and `Tertiary` was the only
subtle step available. Neutral crosses the tier names while preserving the visual order. A definition
resting on "saturated" fails on Brand and Neutral; one resting on the token's tier name fails on
Neutral. Only visual presence survives all five.

## Decision

1. **A surface's paint prominence is a canonical axis named `treatment`**, with values `solid` and
   `soft` and default `solid`.
2. **It is defined by visual presence, never by a colour property or a token tier.** `solid` has more
   visual presence; `soft` is deliberately more contained. A definition naming saturation, lightness
   or a token name is wrong at the first design that breaks it, and three of five schemes already do.
3. **It is orthogonal to `variant` and disjoint from `hierarchy`.** `variant` chooses which colour
   role applies; `treatment` chooses how present that role is; `hierarchy` ranks actions and remains
   for interactive components only.
4. **`hierarchy` keeps its restriction.** A component that is not an action does not take it, and a
   component that merely _contains_ a control is not thereby an action — `Dialog` is the standing
   example.
5. **The axis enters `prop-canon.json` before any contract uses it.** The component schema states
   that a component _"narrows an axis, it never invents a value"_, so a Tag-local `treatment` would
   be a violation regardless of how well it reads.

## Contract

| Concern                          | Where                                                                      |
| -------------------------------- | -------------------------------------------------------------------------- |
| The axis, its values and default | `packages/contracts/prop-canon.json`                                       |
| What a component may narrow      | `packages/contracts/schema/component.schema.json` → `axes`                 |
| The measurement behind it        | [`.ai/maps/proposals/Tag.md`](../../.ai/maps/proposals/Tag.md) §1, §8      |
| The glossary that reports it     | `.ai/maps/prop-map.md` §1 (`pnpm prop-map:check`, gated in CI)             |
| Paint values stay unbound        | [ADR 0003](./0003-paints-name-the-channel-and-leave-the-source-unbound.md) |

## Consequences

**Positive**

- A surface can say it is quieter without pretending to be second in a ranking of actions.
- `variant` keeps one meaning. A `danger` tag can be `soft` without the two facts competing for one
  prop.
- The name is the canon's own: `hierarchy` already calls this thing a _"paint treatment"_.

**Negative / trade-offs**

- **The canon grows, and every axis added is one more thing a proposal must be checked against.**
  Two axes that both modulate appearance — `variant` and `treatment` — are one more pair a future
  author can confuse.
- **It does not settle when a designer should pick `soft`.** The design offers both and says nothing
  about when each applies; that stays a product decision the canon does not make.
- **Two values may be too few.** The source library exposes a third tier (`Tertiary`) for Danger and
  Default, which this axis cannot express. Adding a third value later is a canon change, not a
  component change.
- **How it will fail quietly:** nothing checks that a contract's `treatment` values actually paint
  differently. A contract could declare both and a theme could style them identically; every gate
  stays green and the axis becomes decoration. `report:paints` cannot catch it either, because the
  channels are `null` by ADR 0003.

## Alternatives considered

**Use `hierarchy`.** Rejected: it would require amending the canon's own definition to admit
containers and paint treatments, which is a larger change than adding an axis, and it would make
`hierarchy` mean two different things depending on the component reading it.

**Name it `emphasis`.** Rejected: the canon already glosses `hierarchy` as _"how much emphasis is
applied"_, so the name would collide with an existing concept at the level of the word itself.

**Expose nothing, and let the consumer's theme decide.** Genuinely viable, and the least invented
option — the paint channels are `null` anyway. Rejected because the distinction is author-facing:
which tags are loud is a decision the page makes per tag, not a global theme setting, and without an
axis there is no way for a consumer to say it.
