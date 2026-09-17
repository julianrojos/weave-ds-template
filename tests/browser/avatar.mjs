import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const prefix = JSON.parse(
  readFileSync(new URL('../../ds.config.json', import.meta.url), 'utf8'),
).dataPrefix;

// React only: Avatar has no Vue, Angular or WC binding yet.
export function avatarRegressions() {
  for (const [name, showsPicture] of [
    ['Avatar loaded', true],
    ['Avatar absent', false],
    ['Avatar failed', false],
  ]) {
    test(`${name}: image-status decides between the picture and the initial`, async ({ page }) => {
      await page.goto('/browser-tests.html');
      const root = page.getByRole('img', { name, exact: true });
      const picture = root.locator(`[data-${prefix}-part="image"]`);
      const initial = root.locator(`[data-${prefix}-part="fallback"]`);
      if (showsPicture) {
        await expect(picture).toBeVisible();
        await expect(initial).toBeHidden();
      } else {
        await expect(initial).toBeVisible();
        await expect(picture).toBeHidden();
      }
      await expect(picture).toHaveAttribute('alt', '');
    });
  }
}

export function avatarSourceSwap() {
  test('Avatar: the outcome follows the source when it changes', async ({ page }) => {
    await page.goto('/browser-tests.html');
    const root = page.getByRole('img', { name: 'Avatar swapping', exact: true });
    const picture = root.locator(`[data-${prefix}-part="image"]`);
    const initial = root.locator(`[data-${prefix}-part="fallback"]`);
    await expect(picture).toBeVisible();
    await page.getByRole('button', { name: 'Swap to broken', exact: true }).click();
    await expect(initial).toBeVisible();
    await expect(picture).toBeHidden();
    await page.getByRole('button', { name: 'Swap to picture', exact: true }).click();
    await expect(picture).toBeVisible();
    await expect(initial).toBeHidden();
  });
}

export function avatarGeometry() {
  test('Avatar: the sandbox preserves the measured frame, crop and centring', async ({ page }) => {
    await page.goto('/browser-tests.html');
    const root = page.getByRole('img', { name: 'Avatar loaded', exact: true });
    const picture = root.locator(`[data-${prefix}-part="image"]`);
    const initial = root.locator(`[data-${prefix}-part="fallback"]`);

    await expect(root).toHaveCSS('display', 'inline-grid');
    await expect(root).toHaveCSS('overflow', 'hidden');
    await expect(picture).toHaveCSS('object-fit', 'cover');
    await expect(initial).toHaveCSS('place-items', 'center');

    for (const [size, pixels] of [
      ['s', '24px'],
      ['m', '32px'],
      ['l', '40px'],
    ]) {
      await root.evaluate(
        (element, { prefix, size }) => element.setAttribute(`data-${prefix}-size`, size),
        { prefix, size },
      );
      await expect(root).toHaveCSS('width', pixels);
      await expect(root).toHaveCSS('height', pixels);
    }

    await root.evaluate((element, prefix) => {
      element.setAttribute(`data-${prefix}-size`, 's');
      element.setAttribute(`data-${prefix}-shape`, 'square');
    }, prefix);
    await expect(root).toHaveCSS('border-top-left-radius', '4px');
  });
}

export function avatarReturnToLoadedSource() {
  test('Avatar: returning to a source that loaded before waits for its own load', async ({
    page,
  }) => {
    await page.route('**/avatar-pending.png', () => {});
    await page.goto('/browser-tests.html');
    const root = page.getByRole('img', { name: 'Avatar swapping', exact: true });
    const picture = root.locator(`[data-${prefix}-part="image"]`);
    const initial = root.locator(`[data-${prefix}-part="fallback"]`);
    await expect(picture).toBeVisible();

    await page.getByRole('button', { name: 'Swap to pending', exact: true }).click();
    await expect(initial).toBeVisible();

    // Each source mounts a fresh <img>. Record whether it arrives already visible: a stale outcome
    // for the earlier source would show it before its own load event could have fired.
    await root.evaluate((el) => {
      window.__avatarInserted = [];
      new MutationObserver((records) => {
        for (const r of records)
          for (const n of r.addedNodes)
            if (n.tagName === 'IMG') window.__avatarInserted.push(n.hidden);
      }).observe(el, { childList: true });
    });

    await page.getByRole('button', { name: 'Swap to picture', exact: true }).click();
    await expect(picture).toBeVisible();
    await expect(initial).toBeHidden();
    expect(await page.evaluate(() => window.__avatarInserted)).toEqual([true]);
  });
}
