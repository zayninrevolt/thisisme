import { expect, test } from '@playwright/test';

async function isolateExternalServices(page) {
  await page.route('https://**/*', (route) => {
    if (route.request().url().startsWith('https://decapi.me/')) {
      return route.fulfill({ contentType: 'text/plain', body: 'zaynonfire is offline' });
    }
    return route.abort();
  });
}

test.beforeEach(async ({ page }) => {
  await isolateExternalServices(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
});

async function expectWindowInDesktop(page, selector) {
  await expect.poll(() => page.locator(selector).evaluate((win) => {
    const bounds = win.getBoundingClientRect();
    const bottom = document.querySelector('.taskbar').getBoundingClientRect().top;
    return bounds.left >= 0 && bounds.top >= 0
      && bounds.right <= innerWidth + 1 && bounds.bottom <= bottom + 1;
  }), { message: `${selector} must fit above the taskbar after layout settles` }).toBe(true);
}

test('opened windows remain inside the desktop after dragging and resizing', async ({ page }) => {
  for (const [icon, win] of [['#owIconLink', '#owWin'], ['#msIconLink', '#msWin'], ['#mpIconLink', '#mpWin'], ['#twIconLink', '#twWin'], ['#gamesIconLink', '#gamesWin']]) {
    await page.setViewportSize({ width: 390, height: 568 });
    await page.locator(icon).scrollIntoViewIfNeeded();
    await page.locator(icon).click();
    await expectWindowInDesktop(page, win);
    await page.setViewportSize({ width: 844, height: 390 });
    await expectWindowInDesktop(page, win);
    const bar = await page.locator(`${win} .title-bar`).boundingBox();
    await page.mouse.move(bar.x + 25, bar.y + bar.height / 2);
    await page.mouse.down();
    await page.mouse.move(820, 380, { steps: 5 });
    await page.mouse.up();
    await expectWindowInDesktop(page, win);
    await page.setViewportSize({ width: 320, height: 568 });
    await expectWindowInDesktop(page, win);
    await page.locator(`${win} [data-action="close"]`).click();
  }
});

for (const failure of ['disabled JavaScript', 'failed module']) {
  test(`links stay accessible with ${failure}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: failure !== 'disabled JavaScript', viewport: { width: 320, height: 568 } });
    const page = await context.newPage();
    await isolateExternalServices(page);
    if (failure === 'failed module') await page.route('**/js/desktop.js', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('#boot')).toBeHidden();
    const link = page.getByRole('link', { name: 'Discord', exact: true });
    await link.scrollIntoViewIfNeeded();
    await link.click({ trial: true });
    await context.close();
  });
}

test('boot can be skipped using the keyboard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => sessionStorage.removeItem('booted'));
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.reload();
  await expect(page.locator('#boot')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip intro' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#boot')).toHaveCount(0);
  await expect(page.locator('#win')).toBeFocused();
  await page.reload();
  await expect(page.locator('#boot')).toHaveCount(0);
});

test('rank loading can recover using Retry after a failed request', async ({ page }) => {
  let requests = 0;
  await page.route('https://overfast-api.tekrop.fr/**', (route) => {
    requests += 1;
    return requests === 1
      ? route.fulfill({ status: 503, body: 'Unavailable' })
      : route.fulfill({ contentType: 'application/json', body: JSON.stringify({ competitive: { pc: { season: 23, tank: { division: 'gold', tier: 5 } } } }) });
  });
  await page.locator('#owIconLink').click();
  await expect(page.locator('#owStatus')).toHaveText('Rank unavailable');
  const retry = page.getByRole('button', { name: 'Retry rank loading' });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.locator('#owStatus')).toHaveText('Live');
  await expect(page.locator('#owRanks')).toContainText('Gold 5');
  expect(requests).toBe(2);
});

test('media links have direct fallbacks when embeds or JavaScript fail', async ({ page, browser }) => {
  await page.locator('#spotifyBtn').click();
  const spotify = page.getByRole('link', { name: 'Open in Spotify', exact: true });
  await expect(spotify).toHaveAttribute('href', 'https://open.spotify.com/playlist/32JiIjyJ5ctyqG7LkSZaFA');
  await spotify.click({ trial: true });
  await page.locator('#twIconLink').click();
  const twitch = page.getByRole('link', { name: 'Watch on Twitch', exact: true });
  await expect(twitch).toHaveAttribute('href', 'https://www.twitch.tv/zaynonfire');
  await twitch.click({ trial: true });
  const context = await browser.newContext({ javaScriptEnabled: false });
  const fallbackPage = await context.newPage();
  await isolateExternalServices(fallbackPage);
  await fallbackPage.goto('/');
  await expect(fallbackPage.locator('#spotifyBtn')).toHaveAttribute('href', 'https://open.spotify.com/playlist/32JiIjyJ5ctyqG7LkSZaFA');
  await expect(fallbackPage.locator('#twitchBtn')).toHaveAttribute('href', 'https://www.twitch.tv/zaynonfire');
  await fallbackPage.locator('#spotifyBtn').click({ trial: true });
  await context.close();
});

test('rank timeout leaves an enabled retry and career link', async ({ page }) => {
  await page.route('https://overfast-api.tekrop.fr/**', () => {});
  await page.locator('#owIconLink').click();
  await expect(page.locator('#owStatus')).toHaveText('Rank unavailable', { timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Retry rank loading' })).toBeEnabled();
  await expect(page.locator('#owProfileLink')).toHaveAttribute('href', 'https://overwatch.blizzard.com/en-us/career/Zayn-21529/');
});

test('boot auto-dismisses and Escape skips it without trapping focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => sessionStorage.removeItem('booted'));
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.reload();
  await expect(page.locator('#boot')).toBeVisible();
  await page.clock.runFor(1500);
  await expect(page.locator('#boot')).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem('booted'));
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.locator('#boot')).toHaveCount(0);
  await expect(page.locator('#win')).toBeFocused();
});

test('media fallbacks stay reachable on a short phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const [icon, win] of [['#mpIconLink', '#mpWin'], ['#twIconLink', '#twWin']]) {
    await page.locator(icon).scrollIntoViewIfNeeded();
    await page.locator(icon).click();
    await expectWindowInDesktop(page, win);
    await page.locator(`${win} .media-fallback`).click({ trial: true });
    await page.locator(`${win} [data-action="close"]`).click();
  }
});

test('modified social clicks retain native external-link behaviour', async ({ page }) => {
  for (const id of ['spotifyBtn', 'twitchBtn']) {
    const cancelled = await page.locator(`#${id}`).evaluate((link) => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 });
      let appCancelled = false;
      link.addEventListener('click', (observed) => {
        appCancelled = observed.defaultPrevented;
        observed.preventDefault(); // Prevent test navigation only after the application handler ran.
      }, { once: true });
      link.dispatchEvent(event);
      return appCancelled;
    });
    expect(cancelled).toBe(false);
  }
  await expect(page.locator('#mpWin')).toBeHidden();
  await expect(page.locator('#twWin')).toBeHidden();
});

test('blocked browser storage does not break boot or controls', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    }
  });
  await page.reload();
  await expect(page.locator('#boot')).toHaveCount(0);
  await page.locator('#startBtn').click();
  await page.locator('#crtBtn').click();
  expect(errors).toEqual([]);
});

test('touch window controls are at least 44px and remain operable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await isolateExternalServices(page);
  await page.goto('/');
  const controls = page.locator('#win .control-btn');
  for (const control of await controls.all()) {
    const rect = await control.boundingBox();
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Maximize My Links', exact: true }).tap();
  await expectWindowInDesktop(page, '#win');
  await page.setViewportSize({ width: 667, height: 375 });
  await page.getByRole('button', { name: 'Restore My Links', exact: true }).tap();
  await expectWindowInDesktop(page, '#win');
  await page.locator('#startBtn').tap();
  await page.locator('#aboutBtn').tap();
  await expect(page.locator('#aboutDialog')).toBeVisible();
  const close = await page.locator('#aboutClose').boundingBox();
  expect(close.width).toBeGreaterThanOrEqual(44);
  expect(close.height).toBeGreaterThanOrEqual(44);
  await page.locator('#aboutClose').tap();
  await context.close();
});

for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`primary links are reachable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await expectWindowInDesktop(page, '#win');
    const lastLink = page.locator('#win .links a').last();
    await lastLink.scrollIntoViewIfNeeded();
    await expect(lastLink).toBeInViewport({ ratio: 1 });
    await lastLink.click({ trial: true });
    await expectWindowInDesktop(page, '#win');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
