import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function stubExternalServices(page) {
  await page.route('https://gc.zgo.at/**', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('https://justzayn.goatcounter.com/**', (route) => route.fulfill({ status: 204 }));
  await page.route('https://decapi.me/**', (route) => route.fulfill({ contentType: 'text/plain', body: 'zaynonfire is offline' }));
  await page.route('https://overfast-api.tekrop.fr/**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      username: 'Zayn',
      avatar: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/avatar.png',
      competitive: { pc: {
        season: 23,
        tank: { division: 'silver', tier: 3, rank_icon: 'https://static.playoverwatch.com/rank.png' },
        damage: null,
        support: null,
        open: null
      } }
    })
  }));
  await page.route(/https:\/\/(?:d15f34w2p8l1cc\.cloudfront\.net|static\.playoverwatch\.com)\/.*/, (route) => {
    route.fulfill({ contentType: 'image/png', body: transparentPng });
  });
}

test.beforeEach(async ({ page }) => {
  await stubExternalServices(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
});

test('reduced motion skips boot and the page has no console or CSP errors', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.reload();
  await expect(page.locator('#boot')).toHaveCount(0);
  await page.locator('#owIconLink').click();
  await expect(page.locator('#owStatus')).toHaveText('Live');
  await expect(page.locator('.ow-rank-icon')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('windows restore focus and taskbar controls minimize and restore them', async ({ page }) => {
  const mainTask = page.locator('[data-window-target="win"]');
  await page.locator('[data-action="minimize"][data-target="win"]').click();
  await expect(page.locator('#win')).toBeHidden();
  await expect(mainTask).toBeFocused();
  await mainTask.click();
  await expect(page.locator('#win')).toBeVisible();

  const launcher = page.locator('#owIconLink');
  await launcher.click();
  await expect(page.locator('#owWin')).toBeFocused();
  await page.locator('[data-action="close"][data-target="owWin"]').click();
  await expect(launcher).toBeFocused();
  await expect(page.locator('[data-window-target="owWin"]')).toBeHidden();

  await launcher.click();
  const task = page.locator('[data-window-target="owWin"]');
  await task.click();
  await expect(page.locator('#owWin')).toBeHidden();
  await expect(task).toBeVisible();
  await expect(task).toBeFocused();
  await task.click();
  await expect(page.locator('#owWin')).toBeVisible();
  await expect(task).toHaveAttribute('aria-pressed', 'true');
});

test('Start menu and Minesweeper support keyboard-only operation', async ({ page }) => {
  await page.locator('#startBtn').click();
  await expect(page.locator('#aboutBtn')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#owMenuBtn')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#startBtn')).toBeFocused();
  await expect(page.locator('#startBtn')).toHaveAttribute('aria-expanded', 'false');

  await page.locator('#msIconLink').click();
  await expect(page.locator('#msWin')).toBeFocused();
  const first = page.locator('.ms-cell').nth(0);
  const second = page.locator('.ms-cell').nth(1);
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(second).toBeFocused();
  await page.keyboard.press('f');
  await expect(second).toContainText('🚩');
  await page.keyboard.press('ArrowDown');
  const target = page.locator('.ms-cell').nth(10);
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(target).toHaveClass(/revealed/);
});

test('media embeds remain lazy until their windows are opened', async ({ page }) => {
  const spotify = page.locator('.mp-embed');
  const twitch = page.locator('.tw-embed');
  await expect(spotify).not.toHaveAttribute('src', /.+/);
  await expect(twitch).not.toHaveAttribute('src', /.+/);
  await page.locator('#spotifyBtn').click();
  await expect(spotify).toHaveAttribute('src', /open\.spotify\.com/);
  await page.locator('#twIconLink').click();
  await expect(twitch).toHaveAttribute('src', /player\.twitch\.tv/);
});
