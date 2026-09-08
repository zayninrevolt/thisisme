import { expect, test } from '@playwright/test';

test('taskbar date appears on hover and keyboard focus, dismisses with Escape and rolls over', async ({ page }) => {
  await isolate(page);
  await page.clock.install({ time: new Date('2026-09-08T12:00:00Z') });
  await page.goto('/');
  const date = page.getByRole('tooltip');
  const clock = page.getByRole('button', { name: /Current time:/ });
  await expect(date).toBeHidden();
  await clock.hover();
  await expect(date).toBeVisible();
  await expect(date).toContainText('September');
  await expect(date).toContainText('2026');
  await page.mouse.move(0, 0);
  await expect(date).toBeHidden();
  await clock.focus();
  await expect(date).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(date).toBeHidden();
  await page.keyboard.press('Tab');
  await clock.focus();
  await expect(date).toBeVisible();
  const old = await date.textContent();
  await page.clock.fastForward(24 * 60 * 60 * 1000);
  await expect(date).not.toHaveText(old);
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(date).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Twitch notification is dismissible and does not repeat until a confirmed new live transition', async ({ page }) => {
  await isolate(page);
  await page.clock.install();
  let uptime = '1 hour, 2 minutes';
  let polls = 0;
  await page.route('https://decapi.me/**', (route) => {
    const isUptime = route.request().url().includes('/uptime/');
    if (isUptime) polls++;
    return route.fulfill({ contentType: 'text/plain', body: isUptime ? uptime : '<img src=x onerror=alert(1)>' });
  });
  await page.goto('/');
  const notification = page.getByRole('region', { name: 'Twitch live notification', exact: true });
  await expect(notification).toBeVisible();
  await expect(notification).toContainText('zaynonfire is live');
  await expect(notification).toContainText('<img src=x onerror=alert(1)>');
  await expect(notification.locator('img')).toHaveCount(0);
  await expect(notification.getByRole('link', { name: 'Watch on Twitch' })).toHaveAttribute('href', 'https://www.twitch.tv/zaynonfire');
  await expect(page.locator('.tw-embed')).not.toHaveAttribute('src', /.+/);
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await fitsDesktop(page, '#twNotification');
    await notification.getByRole('button', { name: 'Dismiss live notification' }).click({ trial: true });
  }
  await notification.getByRole('button', { name: 'Dismiss live notification' }).click();
  await expect(notification).toBeHidden();
  await page.clock.runFor(121000);
  await expect.poll(() => polls).toBe(2);
  await expect(notification).toBeHidden();
  await page.reload();
  await expect(page.locator('#twIconLabel')).toContainText('🔴');
  await expect(notification).toBeHidden();
  uptime = 'zaynonfire is offline';
  await page.clock.runFor(121000);
  await expect(page.locator('#twTicker')).toContainText('offline');
  await expect(page.locator('#twIconLabel')).toHaveText('Twitch');
  uptime = '5 seconds';
  await page.clock.runFor(121000);
  await expect(notification).toBeVisible();
});

test('Twitch restore exits fullscreen on phones and maximised Minesweeper keeps a compact board', async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#twIconLink').click();
  const maximise = page.locator('#twWin [data-action="maximize"]');
  await maximise.click();
  await maximise.click();
  expect((await page.locator('#twWin').boundingBox()).width).toBeLessThan(390);
  await page.locator('#twWin [data-action="close"]').click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('#msIconLink').click();
  await page.locator('#msWin [data-action="maximize"]').click();
  const board = await page.locator('#msGrid').boundingBox();
  const cells = await page.locator('.ms-row').first().locator('.ms-cell').evaluateAll((cells) => cells.reduce((width, cell) => width + cell.getBoundingClientRect().width, 0));
  expect(board.width).toBe(cells + 6);
  await page.locator('#msFace').click();
  await expect(page.locator('#msMines')).toHaveText('010');
});

for (const failure of ['http', 'empty', 'html', 'network', 'timeout']) {
  test(`Twitch ${failure} failure stays unknown and recovers without a false live alert`, async ({ page }) => {
    await isolate(page);
    await page.clock.install();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let healthy = false;
    await page.route('https://decapi.me/**', (route) => {
      if (healthy) return route.fulfill({ contentType: 'text/plain', body: 'zaynonfire is offline' });
      if (failure === 'network') return route.abort();
      if (failure === 'timeout') return;
      return route.fulfill({ status: failure === 'http' ? 503 : 200, contentType: 'text/plain', body: failure === 'html' ? '<html>Upstream error</html>' : '' });
    });
    await page.goto('/');
    await expect(page.locator('#twTicker')).toContainText('status unavailable', { timeout: 10000 });
    await expect(page.locator('#twNotification')).toBeHidden();
    await expect(page.locator('#twIconLabel')).toHaveText('Twitch');
    healthy = true;
    await page.clock.runFor(121000);
    await expect(page.locator('#twTicker')).toContainText('offline');
    await expect(page.locator('#twNotification')).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('Twitch outage does not re-arm a dismissed notification and game failure keeps live status usable', async ({ page }) => {
  await isolate(page);
  await page.clock.install();
  let healthy = true;
  await page.route('https://decapi.me/**', (route) => route.fulfill({
    status: healthy && route.request().url().includes('/uptime/') ? 200 : 503,
    contentType: 'text/plain', body: '2 minutes'
  }));
  await page.goto('/');
  await expect(page.locator('#twNotificationText')).toHaveText('zaynonfire is live!');
  await page.locator('#twNotificationDismiss').click();
  await expect(page.locator('#twIconLink')).toBeFocused();
  healthy = false;
  await page.clock.runFor(121000);
  await expect(page.locator('#twTicker')).toContainText('status unavailable');
  healthy = true;
  await page.clock.runFor(121000);
  await expect(page.locator('#twTicker')).toContainText('LIVE NOW');
  await expect(page.locator('#twNotification')).toBeHidden();
});

test('blocked storage retains in-memory alert suppression and hidden tabs do not poll', async ({ page }) => {
  await isolate(page);
  await page.clock.install();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  let polls = 0;
  await page.route('https://decapi.me/**', (route) => {
    if (route.request().url().includes('/uptime/')) polls++;
    return route.fulfill({ contentType: 'text/plain', body: route.request().url().includes('/uptime/') ? '1 minute' : 'Overwatch' });
  });
  await page.goto('/');
  await expect(page.locator('#twNotification')).toBeVisible();
  await page.locator('#twNotificationDismiss').click();
  await page.clock.runFor(121000);
  await expect.poll(() => polls).toBe(2);
  await expect(page.locator('#twNotification')).toBeHidden();
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: true }));
  await page.clock.runFor(121000);
  expect(polls).toBe(2);
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: false }));
  await page.clock.runFor(121000);
  await expect.poll(() => polls).toBe(3);
  await expect(page.locator('#twNotification')).toBeHidden();
});

test('local previews render without console errors', async ({ page }, testInfo) => {
  await isolate(page);
  await page.route('https://decapi.me/**', (route) => route.fulfill({ contentType: 'text/plain', body: route.request().url().includes('/uptime/') ? '2 minutes' : 'Overwatch' }));
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('#twNotification')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('desktop-preview.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => sessionStorage.removeItem('twitch-live-announced'));
  await page.reload();
  await expect(page.locator('#twNotification')).toBeVisible();
  await fitsDesktop(page, '#twNotification');
  await page.screenshot({ path: testInfo.outputPath('mobile-preview.png'), fullPage: true });
  await page.locator('#twNotificationDismiss').click();
  await page.locator('#clockButton').focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('date-preview.png'), fullPage: true });
  await page.goto('/links/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('simple-links-preview.png'), fullPage: true });
  expect(errors).toEqual([]);
});

const apps = [['#owIconLink', '#owWin'], ['#msIconLink', '#msWin'], ['#mpIconLink', '#mpWin'], ['#twIconLink', '#twWin'], ['#gamesIconLink', '#gamesWin']];

async function fitsDesktop(page, selector) {
  await expect.poll(() => page.locator(selector).evaluate((win) => {
    const r = win.getBoundingClientRect();
    const bottom = document.querySelector('.taskbar').getBoundingClientRect().top;
    return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= bottom + 1;
  })).toBe(true);
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 568 }]) {
  test(`all apps maximise and restore at ${viewport.width}px`, async ({ page }) => {
    await isolate(page);
    await page.setViewportSize(viewport);
    await page.goto('/');
    for (const [icon, win] of apps) {
      await page.locator(icon).scrollIntoViewIfNeeded();
      await page.locator(icon).click();
      await expect(page.locator(win)).toBeFocused();
      const title = await page.locator(`${win} .title-text`).textContent();
      const before = await page.locator(win).boundingBox();
      const maximise = page.getByRole('button', { name: `Maximize ${title}`, exact: true });
      await maximise.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator(win)).toHaveClass(/maximized/);
      const restore = page.getByRole('button', { name: `Restore ${title}`, exact: true });
      await expect(restore).toHaveAttribute('aria-pressed', 'true');
      await fitsDesktop(page, win);
      const large = await page.locator(win).boundingBox();
      expect(large.width).toBe(viewport.width);
      await restore.click();
      await expect(page.locator(win)).not.toHaveClass(/maximized/);
      await expect(maximise).toHaveAttribute('aria-pressed', 'false');
      const after = await page.locator(win).boundingBox();
      expect(after).toEqual(before);
      await maximise.click();
      await page.setViewportSize({ width: 844, height: 390 });
      await fitsDesktop(page, win);
      await restore.click();
      await fitsDesktop(page, win);
      await page.locator(`${win} [data-action="close"]`).click();
      await page.setViewportSize(viewport);
    }
  });
}

async function isolate(page) {
  await page.route('https://**/*', (route) => route.fulfill({
    contentType: route.request().resourceType() === 'script' ? 'application/javascript' : 'text/plain',
    body: route.request().url().startsWith('https://decapi.me/') ? 'zaynonfire is offline' : ''
  }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

test('simple links work without JavaScript and link back to the desktop', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 568 } });
  const page = await context.newPage();
  await isolate(page);
  await page.goto('/');
  const expectedLinks = await page.locator('#win .links a').evaluateAll((links) => links.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') })));
  await page.getByRole('link', { name: 'Simple links', exact: true }).click();
  await expect(page).toHaveURL(/\/links\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ZayninRevolt');
  for (const link of expectedLinks) {
    const anchor = page.getByRole('link', { name: link.text, exact: true });
    await expect(anchor).toHaveAttribute('href', link.href);
    await anchor.scrollIntoViewIfNeeded();
    await anchor.click({ trial: true });
  }
  await expect(page.getByRole('link', { name: 'Steam', exact: true })).toHaveAttribute('href', 'https://steamcommunity.com/id/ZaynOnFire');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Explore the desktop', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await context.close();
});
