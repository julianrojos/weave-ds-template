# @juro/tokens

DTCG JSON in, CSS custom properties and TypeScript constants out. Homonymous semantic color and
opacity tokens also produce derived web paint properties; the source relationship and consumption
rule are documented in [`tokens/README.md`](./tokens/README.md#5-consuming-translucent-paints-on-web).

This reference package now contains the token set measured in report 0003 and accepted in ADRs
0005-0009. An unmeasured downstream system may still start empty: in that state the build emits an
empty `:root {}` and says so instead of inventing values.

## Where things are documented

Each fact lives in exactly one authoritative place. Go there rather than trusting a restatement.

| You want                                                 | Look at                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| How to name a token, and the tier it belongs to          | [`tokens/README.md`](./tokens/README.md)                                                                                        |
| How a Figma variable becomes a token                     | [`tokens/README.md`](./tokens/README.md) §3, and `.figma/manifest.json → identity.variableNaming` for the measured mapping rule |
| How tokens become pixels in a component                  | `packages/contracts/components/README.md` §4                                                                                    |
| Why the contract states a token _family_ and not a value | `packages/contracts/schema/README.md`, and `packages/contracts/components/README.md` §4                                         |
| The custom-property prefix                               | `/ds.config.json` — never hard-code it                                                                                          |

## Commands

```bash
pnpm build:tokens     # DTCG JSON -> build/css/variables.css + build/ts/index.{js,d.ts}
pnpm tokens:watch     # same, in watch mode, while editing token JSON
```

## Outputs

| File                               | What it is                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `build/css/variables.css`          | Every token and derived paint as a custom property on `:root`. **This is the file a consumer imports.** |
| `build/ts/index.js` + `index.d.ts` | The same token and paint properties as a typed constant map, for cases where JS needs a name.           |

Everything under `build/` is **generated and gitignored**. Never hand-edit it; edit the JSON and
rebuild. A generated file that someone has edited is worse than no generated file, because the
next build silently discards the edit.

## Consuming it

```ts
import '@juro/tokens/css'; // once, at the app root — @juro/react's barrel already does this
```

The established `juro` prefix comes from `/ds.config.json`; this compiler reads it rather than
maintaining a second copy. Rebranding is outside this repository's supported commands.
