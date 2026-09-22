# Tag — contract changelog

## Unreleased

### Added

- Initial contract, from the proposal in `.ai/maps/proposals/Tag.md` and the imported Figma set
  `4323:266`. `status.level` is `experimental`.
- Axes: `variant` (neutral · brand · success · warning · danger, default `neutral`) and `treatment`
  (solid · soft, default `solid`). `treatment` is a new canonical axis, added to `prop-canon.json`
  for this contract under [ADR 0006](../../../../docs/ADR/0006-paint-prominence-is-its-own-axis-not-a-hierarchy.md).
- States: `hover` (`intrinsic`, `internal`), which repaints the surface and nothing else;
  `focus-visible` (`intrinsic`, `internal`), on the remove control; and
  `removable` (`authored`, `consumer`, default `true`) — the measured `Removable#147:0`, which the
  design binds to the remove control's visibility.
- Parts: `root`, `label`, and `dismiss` — the remove control, which declares `role: "button"`,
  `visibleWhen: "removable"` and `activates: { "requests": "remove" }`. This is the first use of
  that activation shape, added to the schema under
  [ADR 0007](../../../../docs/ADR/0007-a-part-requests-an-action-it-cannot-perform.md).
- Children: the label, as text. One slot, `removeIcon`, **required**, which fills the remove control
  with a decorative glyph the consumer supplies.

### Decisions worth knowing

- **The design's `Variant=Primary | Secondary` is not the canon's `variant`.** The canon's `variant`
  is semantic intent, which is the design's `Scheme` axis; `Primary`/`Secondary` selects how present
  that intent is, which is `treatment`. Mapping the two axes by their Figma names would have swapped
  their meanings exactly.
- **`hierarchy` does not apply, although the tag declares a control.** Only `Button` takes that axis
  here; `Dialog` holds real controls in a slot and does not. A rank is also relational — twenty tags
  each marked `primary` assert nothing about one another — and what was measured is a paint change,
  which the canon says `hierarchy` is distinct from.
- **The remove control is a declared part, not a slot.** It is the same component at 16 × 16 in the
  same position in every variant, with no component properties of its own. An earlier call made it a
  slot by analogy with `Dialog`'s `actions`; that analogy was withdrawn on measurement, because
  `Dialog`'s slot holds arbitrary consumer content and this holds one fixed affordance.
- **Its presence is a capability, not a constant.** The first pass counted the twenty variants, saw
  the control in all of them and called it unconditional — but the twenty are the VARIANT grid at
  `Removable`'s default of `true`, and a count of renderings cannot tell "always present" from
  "present at the default". The proposal §5 records the withdrawn claim.
- **Removal is `requests`, not a state.** A `removed` state would compile to a settable input, which
  a consumer could use to claim a removal the list's owner never performed. The tag cannot observe
  whether removal happened, so it declares that it asks rather than that it knows.
- **The accessible name for the remove control is the consumer's, and the label is not enough.** Ten
  tags labelled `Tag` would give ten identically named controls; the name has to say what is being
  removed. The rule that decides when that prop appears asks whether the part is GUARANTEED to
  render text — an optional text slot does not count, because a consumer who leaves it empty would
  otherwise get a focusable button with no name and no fallback.
- **`State=Hover` is not a prop.** The platform tracks it, so it is an intrinsic state — a `hover`
  prop would make JavaScript track a pointer to reproduce something the browser already does.

### Known gaps

- **The design does not meet the hit-area floor this contract claims.** `a11y.minHitArea` is 24, the
  repository's floor for an interactive control, and the remove glyph is drawn 16 × 16. A 16 px glyph
  can carry a 24 px target through padding, so the claim is one the consumer's theme must satisfy
  rather than one the measured design already satisfies.
- **No focus indicator is drawn for the remove control**, and the contract claims `focusVisible`
  anyway. A focusable control without one is a defect regardless of what the design shows; the
  treatment is the consumer's, its existence is not. The state is declared in `states` alongside
  `hover`, as the other eight contracts that use it do — an earlier draft used `focus-visible` in
  `dismiss.states` without declaring it, which emitted a socket labelled "no visual recorded" and
  skipped the validation every declared state gets.
- **The remove control's hover was removed, not styled.** An earlier draft gave `dismiss` a `hover`
  colour change while the state's own `visual` said the design "repaints only the background and
  leaves the label untouched". That is an unmeasured behaviour and a socket for it; the measurement
  wins.
- **Only React has a Tag binding today.** All four emitters implement `activates.requests`: React
  exposes the required `onRemoveRequest` callback, Vue and Angular emit `remove-request` /
  `removeRequest`, and Web Components dispatches the composed `juro-remove-request` event. Parity
  still reports Tag as React-only until the other three bindings are authored. Vue, Angular and Web
  Components cannot require a consumer to listen to those events, so the generated source and
  `verify:parity` also report that limitation as **NON-CONFORMING** under ADR 0005 and ADR 0007.
  Web Components also cannot require its `remove-label` attribute statically. Its generated,
  explicitly non-conforming fallback keeps the request control hidden and prevents its event until
  the attribute contains a non-empty name; it does not interrupt the rest of the component's DOM
  synchronization with a runtime exception.
- **`removable={false}` still demands `onRemoveRequest` and `removeLabel`.** The callback is
  required wherever the type system can say so, because a request owns nothing and an absent one
  leaves an inert control (ADR 0007). Expressing "required only when `removable`" needs
  discriminated props, which Angular and Web Components cannot represent, so the noise is accepted
  rather than the parity broken.
- **`removeIcon` was optional, and the reason given for it was invented.** This changelog claimed a
  theme could draw the glyph through `background-image` or `mask` "which the contract's paints
  allow" — `dismiss` paints `inline-size`, `block-size`, `color` and `border-radius`, and neither of
  those two. The contract contradicted the excuse written in its own "known gaps" section, which is
  exactly the failure ADR 0005 names. The slot is now **required**: the design draws the glyph in
  twenty of twenty variants, so an optional one was not the measurement either.
- **Every colour, radius and type value binds to an external library** this repository does not map,
  so all paint channels are `null` and the consumer's theme supplies them. The source library also
  has no `Background/Brand/Secondary`, which is why its Brand pair is a greyscale inversion where the
  other schemes are tints — recorded in the proposal §8.2 as an inventory asymmetry, not a defect.
- **No `size` axis.** All twenty variants are 32 tall; one measured size is not a scale.
