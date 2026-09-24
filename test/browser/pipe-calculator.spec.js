import { expect, test } from '@playwright/test';

test('switches calculation purpose and totals up to four sequential pipe sections', async ({ page }, testInfo) => {
  await page.goto('/pipe/');

  await expect(page.getByRole('heading', { name: 'Pipe sizing & pressure loss' })).toBeVisible();
  await expect(page.getByTestId('section-count')).toHaveText('1 section');
  await expect(page.getByTestId('route-result')).toContainText('mbar');
  await page.screenshot({ path: testInfo.outputPath('pipe-calculator-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: 'Add section' }).click();
  await expect(page.getByTestId('section-count')).toHaveText('2 sections');
  await page.getByRole('button', { name: 'Add section' }).click();
  await page.getByRole('button', { name: 'Add section' }).click();
  await expect(page.getByTestId('section-count')).toHaveText('4 sections');
  await expect(page.getByRole('button', { name: 'Add section' })).toBeDisabled();

  await page.getByLabel('Calculation purpose').selectOption('water');
  await expect(page.getByLabel('Water temperature (°C)')).toBeVisible();
  await page.getByLabel('Design flow for Section 1 (L/min)').fill('10');
  await expect(page.getByTestId('route-result')).toContainText('kPa');

  await page.getByLabel('Calculation purpose').selectOption('heating');
  await expect(page.getByLabel('Heating design temperature difference (K)')).toBeVisible();
  await expect(page.getByLabel('Fittings method for Section 1')).toHaveValue('unknown-50-percent');
  await expect(page.locator('.section-card .field-note')).toHaveCount(4);
  await expect(page.locator('.section-card .field-note').first()).toContainText('Adds 50% of the actual developed length');
  await page.getByLabel('Downstream heat load for Section 1 (kW)').fill('12');
  await expect(page.getByTestId('section-result-0')).toContainText('8.6 L/min');

  await page.getByLabel('Calculation purpose').selectOption('water');
  await page.getByLabel('Water source').selectOption('gravity-tank');
  await expect(page.getByLabel('Vertical drop from tank water surface to tap outlet (m)')).toBeVisible();
  await expect(page.getByTestId('gravity-expected-flow')).toContainText('L/min');
  await page.screenshot({ path: testInfo.outputPath('pipe-calculator-gravity-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('pipe-calculator-390.png'), fullPage: true });
  await expect(page.locator('#calculator-error')).toBeHidden();
});
