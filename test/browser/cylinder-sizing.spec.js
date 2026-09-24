import { expect, test } from '@playwright/test';

test('cylinder calculator uses the greater of the occupant and bedroom-plus-one rules', async ({ page }) => {
  await page.goto('/cylinder/');

  await expect(page.getByTestId('cylinder-result')).toHaveText('135 L');
  await expect(page.getByTestId('cylinder-rule-breakdown')).toHaveText(
    'Occupant rule: 135 L · Bedroom rule: 135 L. Both rules are equal.',
  );

  await page.getByLabel('Household occupants (people)').fill('2');
  await page.getByLabel('Bedrooms').fill('3');
  await expect(page.getByTestId('cylinder-result')).toHaveText('180 L');
  await expect(page.getByTestId('cylinder-rule-breakdown')).toContainText('The bedroom rule governs.');

  await page.getByLabel('Household occupants (people)').fill('5');
  await expect(page.getByTestId('cylinder-result')).toHaveText('225 L');
  await expect(page.getByTestId('cylinder-rule-breakdown')).toContainText('The occupant rule governs.');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.locator('#calculator-error')).toBeHidden();
});
