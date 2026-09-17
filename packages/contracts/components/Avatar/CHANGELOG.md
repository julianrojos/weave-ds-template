# Avatar — contract changelog

## Unreleased

### Added

- Initial contract, from the proposal in `.ai/maps/proposals/Avatar.md` and the Figma set `4284:256`.
  `status.level` is `experimental`.
- Axes: `size` (s · m · l, default `m`) and `shape` (circle · square, default `circle`). `shape` is
  a new canonical axis, added to `prop-canon.json` for this contract.
- State: `image-status` (`absent` · `loaded` · `failed`), `internal`, observed through
  `derivedFrom` on the `image` slot. `emission.resourceObservation: "reject"` records that a
  backend without load/error observation cannot emit this contract faithfully.
- Slots: `image` (an image source) and `fallback` (text). No children.

### Decisions worth knowing

- **The design's `Type=Image | Initial` is not a prop.** As a prop it could claim a picture the
  platform never loaded, so which one shows is an observed state instead.
- **The accessible name lives on the root.** The picture is decorative inside it, and a lone initial
  is never announced on its own. A decorative avatar is hidden by the consumer.
- **React observes the picture's `load` and `error` events** on an `<img>` keyed by its source.
  Every change of `image` discards the previous outcome — including a return to a source that loaded
  earlier — so the state reads `absent` until the newly mounted picture reports its own result.
- **Backends without resource observation fail explicitly.** Vue, Angular and Web Components do not
  turn an image resource into ordinary projected content or emit an undeclared derived state.
- **The default size is `m`**, the canon's default, although the Figma set defaults to `Large`.

### Known gaps

- **Centring and clipping are not in the contract.** Paints reject structural channels and there is
  no `layout` block, so the consumer's theme file supplies them, as for every other contract.
- **Vue, Angular and Web Components have no binding yet.** `verify:parity` reports the coverage gap;
  if one is added before that backend can observe an image resource, its emitter rejects the contract.
