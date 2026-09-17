# Prop map proposal — Avatar

- **Status:** Built (experimental, React only). Decisions recorded in §7 (2026-09-17); the emitter
  findings in §8 were resolved by the extension in §9.
- **Source:** [Avatar](https://www.figma.com/design/CAZybLope1cikvLyECBQnD/weave-DS---Mokkap-masterclass-29-08-2026--Copy-?node-id=4284-256)
  (component set `4284:256`, page `test_juro_4_2`)
- **Read alongside:** [`../prop-map.md`](../prop-map.md) §1,
  [`packages/contracts/components/README.md`](../../../packages/contracts/components/README.md) §2–4
- **Measured from the file** on 2026-09-17 through the Plugin API — every value below came from the
  nodes, not a screenshot.

## 1. What the design actually contains

One component set, twelve variants: `Type` × `Size` × `Shape`, plus a text property `Initials`
(default `F`). No variant has padding or auto-layout; every frame clips its content.

| `Size`   | Frame | `Square` radius | `Circle` radius | Initials style | Font size / line height |
| -------- | ----- | --------------- | --------------- | -------------- | ----------------------- |
| `Large`  | 40×40 | 8               | full            | `Subheading`   | 20 / 120%               |
| `Medium` | 32×32 | 8               | full            | `Body Base`    | 16 / 140%               |
| `Small`  | 24×24 | 4               | full            | `Body Small`   | 14 / 140%               |

- **`Type=Initial`**: a solid background bound to `Background/Brand/Default`, and one centred text
  node bound to `Text/Brand/On Brand`.
- **`Type=Image`**: a rectangle with an image fill in `FILL` mode, which crops rather than
  distorts. The frame behind it carries an unbound white fill.
- **The set's own description:** initials should be a single character, because two would overflow
  the smaller frames.

**Finding, not decided here:** this set uses a different variable system from the one
`.figma/manifest.json` records. Its collections are `Size`, `Color` and `Typography`, and its type is
Inter rather than Lexend Deca. None of these bindings map to this repository's tokens.

## 2. What is a prop, and what is not

| In Figma                  | Really is                                           | Belongs in                                 |
| ------------------------- | --------------------------------------------------- | ------------------------------------------ |
| `Size=Large/Medium/Small` | **An actual axis**                                  | canonical `size`: `l`, `m`, `s`            |
| `Shape=Circle/Square`     | **An axis the canon does not have**                 | a proposed new `shape` axis — see §3.1     |
| `Type=Image/Initial`      | **Derived state**: whether an image actually loaded | an `internal` state, not a prop — see §3.2 |
| `Initials=F`              | **Content**                                         | the fallback part's text                   |

`Type` is the case the proposals README warns about. As a prop it could lie: `type="image"` with a
URL that fails to load would render an empty frame. Whether the image shows is a fact the component
observes, so the design's two `Type` values are two outcomes of one observation.

## 3. Proposed surface

### 3.1 Axes

| Axis    | Values             | Default  | Notes                                                                                                                                        |
| ------- | ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `size`  | `s`, `m`, `l`      | `m`      | A contiguous subset of the canon. Figma's set defaults to `Large`; `m` is proposed to match the canon default, which is a choice to confirm. |
| `shape` | `circle`, `square` | `circle` | **New axis.** It chooses the frame's silhouette. The file does not say when each is used, so that usage rule is still open.                  |

A new axis is a change to [`packages/contracts/prop-canon.json`](../../../packages/contracts/prop-canon.json)
and needs its reason recorded there.

### 3.2 Composition, parts and states

```
root              the frame: size, silhouette, clipping
├── image         the picture; visible only once it has loaded
└── fallback      the initials; visible whenever the image is not showing
```

- **One `internal` state, `image-status: absent | loaded | failed`**, declared with
  `derivedFrom: { slot: image }` and observed from the picture's load and error events. The picture
  is `visibleWhen: image-status=loaded` and the initial `image-status!=loaded`, so a value added
  later still falls back. An earlier draft used `showing: image | fallback`; §8 is why it changed.
- **Content:** a source for `image` (its alternative text is empty; the root carries the name, §7); text for `fallback`.
- **Paints** stay `null` per [ADR 0003](../../../docs/ADR/0003-paints-name-the-channel-and-leave-the-source-unbound.md):
  the root's background and radius, and the fallback's colour and font.

## 4. How this maps back to the Figma variants

| Figma          | Contract                     |
| -------------- | ---------------------------- |
| `Size=Large`   | `size=l`                     |
| `Size=Medium`  | `size=m`                     |
| `Size=Small`   | `size=s`                     |
| `Shape=Circle` | `shape=circle`               |
| `Shape=Square` | `shape=square`               |
| `Type=Image`   | state `image-status=loaded`  |
| `Type=Initial` | state `image-status!=loaded` |
| `Initials`     | the `fallback` part's text   |

## 5. Deliberately not exposed

- **A `type` prop.** It would let a consumer claim an image the browser never loaded; see §2.
- **Colours, radii and type sizes.** They are consumer paint (ADR 0003). The Figma bindings also
  belong to a variable system this repository does not map.
- **Enforcing one initial.** The design asks for it, but a contract cannot check content; it
  belongs in usage guidance.
- **A delay before the fallback appears.** Some avatar implementations offer one; this design does
  not show one, so it is not proposed.

## 6. What must be decided before a contract is written

1. **Accept `shape` as a canonical axis**, and say when each value is used.
2. **Confirm the default size**: `m` from the canon, or `l` from the file.
3. **The accessible name.** Alternative text for a meaningful image, empty for a decorative one next
   to a visible name, and what a lone initial announces. None of this is in the design, and it must
   not be invented.
4. **Generation scope.** No emitter can build this yet. No backend renders an `img`, none derives a
   state from load or error events, and `platform-web` has no image facts. The choice is either to
   extend the behaviour vocabulary and all four emitters, or to ship a contract that honestly
   compiles as `partially` or `shell`, as `Tooltip` and `Dialog` do.
5. **Which backends and which output directory.** Every existing contract is generated into all four
   sandboxes.

## 7. Decisions, 2026-09-17

| Question         | Decision                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shape`          | Accepted as a new canonical axis, `circle` \| `square`, default `circle`. When each value is used is still undocumented.                                                          |
| Default size     | `m`, the canon default. Not asked separately; Figma's set defaults to `Large`.                                                                                                    |
| Accessible name  | One name supplied by the consumer on the root, covering both the image and the initials. An empty name makes the avatar decorative. A lone initial is never announced on its own. |
| Generation scope | Revised after §8: a minimal React emitter extension (§9), which observes load and error.                                                                                          |
| Backend          | React, generated into `apps/react-sandbox/src/components`.                                                                                                                        |

## 8. What the React emitter produced before the extension

Checked on 2026-09-17 by passing a draft of this contract to `emitTsx` in memory. Nothing was
written to the repository.

1. **The output does not compile.** `visibleWhen: "showing=image"` compiles to
   `hidden={!(showing === 'image')}`, but nothing declares `showing`. The emitter creates local state
   only for `shared` states, so an `internal` state that nothing derives has no declaration.
2. **No image can render.** The `image` part is emitted as an empty `<div>`.
   `packages/platform-web/profile.json` lists no `img` element, and no slot kind carries a source or
   alternative text.
3. **The root has no consumer-supplied name.** The root gets `role="img"`, but no surface rule
   produces a name input for it, so the accessibility decision above cannot be expressed.

So the "contract without behaviour" decision is not reachable as stated: generating now would ship
code that fails to typecheck and can never show a picture.

## 9. The extension that unblocked it

- `platform-web` lists `img`, and a slot that accepts `image` is a source string rendered as
  `<img alt="">`. The name stays on the root.
- A state may declare `derivedFrom: { slot }` (internal, `absent | loaded | failed`). React discards
  the outcome on every change of source, so a new source — or a return to one that loaded before —
  reads `absent` until it settles, and a broken one falls back to the initial. `verify:contract`
  checks that the slot exists, accepts `image`, renders into a declared part, and is observed by at
  most one state.
- `visibleWhen` accepts `state!=value`, parsed once in `@juro/emit-web` for all four backends.
- Centring the initial and clipping the picture are layout, which paints reject and no contract
  block expresses yet, so they stay in the consumer's theme file like every other component's.
