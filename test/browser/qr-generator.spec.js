import { expect, test } from '@playwright/test';

test('QR generator creates a scannable-sized canvas and downloads a PNG locally', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/qr-generator/');
  await expect(page.getByRole('heading', { name: 'QR generator.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled();

  await page.getByLabel('What should the QR code contain?').fill('https://dokkadoki.co.uk/membership');
  await page.getByRole('button', { name: 'Create QR code' }).click();
  await expect(page.getByRole('status')).toContainText('QR code ready');
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
  expect(await page.locator('#qr-canvas').evaluate(canvas => canvas.width >= 500 && canvas.height >= 500)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('zayn-qr-code.png');
  expect(errors).toEqual([]);
});

test('QR generator handles an empty submission with a useful error', async ({ page }) => {
  await page.goto('/qr-generator/');
  await page.getByRole('button', { name: 'Create QR code' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a link or some text first.');
});
