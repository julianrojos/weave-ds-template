// GENERATED from Avatar.contract.json + Avatar.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Avatar --out <dir>
//
// Stands for a person or entity in a small fixed frame: their picture when one is available, their initial otherwise.

import { forwardRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import './Avatar.structure.css';
import './Avatar.theme.css';

export interface AvatarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'size' | 'shape' | 'image' | 'fallback'
> {
  /** The frame's size. The design measures 24, 32 and 40. Defaults to `m`. */
  size?: 's' | 'm' | 'l';
  /** The frame's silhouette. When each applies is not decided. Defaults to `circle`. */
  shape?: 'circle' | 'square';
  /** The picture's source. Optional: without one, the initial shows. */
  image?: string;
  /** The initial. One character, per the design. */
  fallback?: ReactNode;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  { size = 'm', shape = 'circle', image, fallback, className, ...rest },
  ref,
) {
  // `image-status` is observed, never set. Any change of source discards the previous outcome —
  // including a return to a source that loaded before — so it reads `absent` until this
  // mount's own load or error arrives.
  const [imageStatusOutcome, setImageStatusOutcome] = useState<{
    source: string;
    status: 'loaded' | 'failed';
  } | null>(null);
  const [imageStatusOutcomeFor, setImageStatusOutcomeFor] = useState(image);
  if (imageStatusOutcomeFor !== image) {
    setImageStatusOutcomeFor(image);
    setImageStatusOutcome(null);
  }
  const imageStatus: 'absent' | 'loaded' | 'failed' =
    image && imageStatusOutcome?.source === image ? imageStatusOutcome.status : 'absent';

  return (
    <div
      {...rest}
      ref={ref}
      role="img"
      data-juro-size={size}
      data-juro-shape={shape}
      data-juro-component="Avatar"
      data-juro-part="root"
      className={className}
    >
      <img
        src={image}
        alt=""
        key={image}
        onLoad={() => setImageStatusOutcome({ source: image as string, status: 'loaded' })}
        onError={() => setImageStatusOutcome({ source: image as string, status: 'failed' })}
        hidden={!(imageStatus === 'loaded')}
        data-juro-part="image"
      />
      <div hidden={!(imageStatus !== 'loaded')} data-juro-part="fallback">
        {fallback}
      </div>
    </div>
  );
});
