# Component anatomy

The four files, shown with a worked example.

> **This example is documentation, not code.** No component ships in this template. `Button` is
> used here because it exercises every part of the shape — polymorphism, a slot, a boolean state,
> two variant axes and a nested node. Do not copy it into `packages/`; build the component the
> governing decision actually calls for.

## `Button.tsx`

```tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';
import styles from './Button.module.css';

const buttonVariants = cva(styles.root, {
  variants: {
    hierarchy: { primary: styles.primary, secondary: styles.secondary, tertiary: styles.tertiary },
    size: { s: styles.sizeS, m: styles.sizeM, l: styles.sizeL },
  },
  // INVARIANT 2 — the only machine-readable home for a variant default.
  defaultVariants: { hierarchy: 'primary', size: 'm' },
});

export interface ButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    VariantProps<typeof buttonVariants> {
  /** Adornment before the label. */
  iconStart?: ReactNode;
  /** Shows a busy state and blocks activation. The label stays visible. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { hierarchy, size, iconStart, loading = false, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      data-juro-part="root"
      data-juro-state={loading ? 'loading' : undefined}
      aria-busy={loading || undefined}
      // INVARIANT 1 — data-juro-part and styles.<same name> travel together.
      className={clsx(buttonVariants({ hierarchy, size }), className)}
      {...rest}
    >
      {iconStart && (
        <span data-juro-part="icon-start" className={styles.iconStart}>
          {iconStart}
        </span>
      )}
      <span data-juro-part="label" className={styles.label}>
        {children}
      </span>
    </button>
  );
});
```

Points worth noticing:

- **`forwardRef` with a named function**, so the component has a display name without a separate
  assignment.
- **`className` merges last**, so a consumer can override. The contract records _which_ node it
  lands on, because that node's every declaration becomes overridable from outside.
- **`{...rest}` after the managed props**, so a consumer cannot accidentally clobber `data-juro-part`.
- **JSDoc on every prop that is not a variant.** Variant props get their documentation from the
  axis registry; local props get it here, and it is what shows up in `pnpm contract`.
- **`data-juro-state` for a state that is not a native pseudo-class.** `:hover` and `:disabled` need
  nothing — the browser already owns them.

## `Button.module.css`

```css
.root {
  display: inline-flex;
  align-items: center;
  gap: var(--juro-space-2);

  background-color: var(--juro-color-fill-loud);
  color: var(--juro-color-on-loud);
  border: var(--juro-border-width-s) solid transparent;
  border-radius: var(--juro-radius-m);
  padding-inline: var(--juro-space-4);
  font-family: var(--juro-font-family-ui);
  transition-duration: var(--juro-motion-duration-fast);
}

.root:hover {
  background-color: var(--juro-color-fill-loud-hover);
}
.root:focus-visible {
  outline-color: var(--juro-color-focus-ring);
}
.root[data-juro-state='loading'] {
  cursor: progress;
}

.iconStart {
  display: inline-flex;
}
.label {
  min-width: 0;
}
```

- **Every value that carries design intent is a token.** A raw `#5146e6` here is what
  `report:paints` exists to find.
- **A class per named node**, matching its `data-juro-part`. `icon-start` → `.iconStart`.
- **States as pseudo-classes where the browser has one**, `[data-juro-state]` where it does not.

## `index.ts`

```ts
export { Button, type ButtonProps } from './Button';
```

## `Button.contract.json`

See `authoring-the-contract.md`. It carries what none of the above can state: the rendered element,
where the ref goes, which node absorbs `className`, the a11y commitments, what the slots accept,
and the token policy per node.

## And then the public barrel

`packages/react/src/index.ts`, alphabetically:

```ts
export { Button, type ButtonProps } from './components/Button/Button';
```

The gate fails without this. A component that is not exported is invisible to every consumer, and
neither the compiler nor the build says a word.
