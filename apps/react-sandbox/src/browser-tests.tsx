import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Avatar } from './components/Avatar';
import { Button } from './components/Button';

const PICTURE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4'/%3E%3C/svg%3E";
const BROKEN = 'data:image/png;base64,broken';
// Never answered: the browser test holds this request open so the source stays pending.
const PENDING = '/avatar-pending.png';

// Swaps one Avatar's source, so an outcome must follow the source rather than the element.
function SwappingAvatar() {
  const [image, setImage] = useState(PICTURE);
  return (
    <>
      <Avatar aria-label="Avatar swapping" image={image} fallback="S" />
      <button type="button" onClick={() => setImage(BROKEN)}>
        Swap to broken
      </button>
      <button type="button" onClick={() => setImage(PICTURE)}>
        Swap to picture
      </button>
      <button type="button" onClick={() => setImage(PENDING)}>
        Swap to pending
      </button>
    </>
  );
}

createRoot(document.getElementById('fixtures')!).render(
  <>
    <Button>Style probe</Button>
    <Avatar aria-label="Avatar loaded" image={PICTURE} fallback="L" />
    <Avatar aria-label="Avatar absent" fallback="A" />
    <Avatar aria-label="Avatar failed" image={BROKEN} fallback="F" />
    <SwappingAvatar />
  </>,
);
