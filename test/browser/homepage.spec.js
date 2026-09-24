import { expect, test } from '@playwright/test';

const linkedin = 'https://uk.linkedin.com/in/richard-chamberlain-577043230';

test.beforeEach(async ({ page }) => {
  await page.route('https://gc.zgo.at/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const [width, height] of [[320,568],[390,844],[430,932],[768,1024],[844,390],[1280,1000],[1440,1000]]) {
  test(`homepage keeps its approved style and has no overflow at ${width}x${height}`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({width,height});
    await page.goto('/');
    await expect(page.locator('.open-intro .profile-row')).toHaveCSS('display','flex');
    await expect(page.locator('.profession')).toHaveCSS('font-family', /Georgia/);
    await expect(page.locator('.contact-button')).toHaveCSS('background-color','rgb(200, 216, 169)');
    await expect(page.locator('.avatar')).toHaveCSS('border-radius','50%');
    await expect(page.locator('.open-intro')).toHaveCSS('border-top-width','0px');
    await expect(page.locator('.site-header')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('main *').evaluateAll(elements => elements.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && getComputedStyle(el).position !== 'absolute' && (r.right > innerWidth+1 || r.left < -1);
    }).map(el=>el.getAttribute('class')))).toEqual([]);
    expect(await page.locator('img').evaluateAll(images=>images.every(i=>i.complete && i.naturalWidth > 0))).toBe(true);
    await page.locator('.social-grid').getByRole('link',{name:'LinkedIn',exact:true}).click({trial:true});
    expect(errors).toEqual([]);
    if (width === 390 || width === 1280) {
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:testInfo.outputPath(`homepage-${width}.png`),fullPage:true});
    }
  });
}

test('homepage supports keyboard navigation and native expandable specialisms', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
  await expect(page.getByRole('link',{name:'Skip to content'})).toHaveCSS('outline-style','solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  const renewables = page.locator('details').nth(2);
  await renewables.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(renewables).toHaveAttribute('open','');
  await page.keyboard.press('Enter');
  await expect(renewables).not.toHaveAttribute('open');
  await page.getByRole('link',{name:'Say hello'}).click();
  await expect(page).toHaveURL(/#connect$/);
  await expect(page.locator('#connect-title')).toBeInViewport();
  await expect(page.locator('html')).toHaveCSS('scroll-behavior','auto');
});

test('homepage and simple links remain usable without JavaScript', async ({ browser }) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.goto('/');
  await expect(page.locator('.contact-button')).toHaveAttribute('href',linkedin);
  await page.locator('details').nth(2).locator('summary').click();
  await expect(page.locator('details').nth(2)).toHaveAttribute('open','');
  await page.getByRole('link',{name:'Simple links',exact:true}).click();
  await expect(page).toHaveURL(/\/links\/$/);
  await expect(page.getByRole('link',{name:'LinkedIn',exact:true})).toHaveAttribute('href',linkedin);
  await page.getByRole('link',{name:'Home',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Zayn.');
  await context.close();
});

test('homepage keeps the desktop reachable and all existing personal destinations', async ({ page }) => {
  await page.route('https://decapi.me/**',route=>route.fulfill({contentType:'text/plain',body:'zaynonfire is offline'}));
  await page.goto('/');
  const homeLinks=await page.locator('a').evaluateAll(links=>links.map(a=>a.href.replace(/\/$/,'')));
  await page.getByRole('link',{name:'Visit the original homepage'}).click();
  await expect(page).toHaveURL(/\/desktop\/$/);
  await expect(page.locator('#win')).toBeVisible();
  const originalLinks=await page.locator('#win .links a').evaluateAll(links=>links.map(a=>a.href.replace(/\/$/,'')));
  for (const link of originalLinks) expect(homeLinks).toContain(link);
  await expect(page.locator('#boot')).toBeHidden();
  await expect(page.getByRole('button',{name:'Open Minesweeper',exact:true})).toBeVisible();
  await expect(page.locator('#msGrid .ms-cell')).toHaveCount(81);
  await expect(page.locator('#gamesWin .game-card')).toHaveCount(3);
  await expect(page.locator('#mpWin .media-fallback')).toHaveAttribute('href',/open\.spotify\.com/);
  await expect(page.locator('#twWin .media-fallback')).toHaveAttribute('href',/twitch\.tv/);
  await page.getByRole('link',{name:'Home',exact:true}).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading',{level:1})).toHaveText('Zayn.');
});

test('homepage introduces Zayn and offers the exact professional LinkedIn contact', async ({ page }) => {
  await page.route('https://gc.zgo.at/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zayn.', { timeout: 2000 });
  await expect(page.locator('.profession')).toHaveText(/Gas building surveyor\.\s*Specialising in\s*renewable technology\./);
  await expect(page.locator('.contact-button')).toHaveAttribute('href', linkedin);
  await expect(page.getByRole('link', { name: 'Visit the original homepage' })).toHaveAttribute('href', '/desktop/');
});

test('homepage puts working tools and a fuller DokkaDoki story within easy reach', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open working tools' }).click();
  await expect(page).toHaveURL(/#tools$/);
  await expect(page.locator('#tools')).toBeInViewport();
  await expect(page.getByRole('link', { name: 'Open heat loss survey' })).toHaveAttribute('href', 'https://heatloss.justzayn.com/');
  await expect(page.getByRole('link', { name: 'Open cylinder calculator' })).toHaveAttribute('href', '/cylinder/');
  await page.getByRole('link', { name: 'Open cylinder calculator' }).click();
  await expect(page).toHaveURL(/\/cylinder\/$/);
  await expect(page.getByRole('heading', { name: 'Cylinder sizing' })).toBeVisible();
  await expect(page.getByTestId('cylinder-result')).toHaveText('135 L');
  await expect(page.getByTestId('cylinder-rule-breakdown')).toContainText('Both rules are equal.');
  await page.getByLabel('Household occupants (people)').fill('2');
  await page.getByLabel('Bedrooms').fill('3');
  await expect(page.getByTestId('cylinder-result')).toHaveText('180 L');
  await expect(page.getByTestId('cylinder-rule-breakdown')).toContainText('The bedroom rule governs.');
  await expect(page.getByTestId('recharge-result')).toHaveText('3 hr 29 min');
  await page.goBack();
  await expect(page).toHaveURL(/#tools$/);
  await expect(page.locator('.tool-card')).toHaveCount(3);
  await expect(page.locator('.tool-card').filter({ hasText: 'Pipe sizing' })).toContainText('In development');
  await page.getByRole('link', { name: 'DokkaDoki', exact: true }).click();
  await expect(page).toHaveURL(/#dokkadoki$/);
  await expect(page.locator('#dokkadoki-title')).toContainText(/DokkaDoki is\s*more than coffee\./);
  await expect(page.locator('.dokkadoki-values details')).toHaveCount(3);
  const mangaLabel = page.locator('.dokkadoki-values summary strong').first();
  await expect(mangaLabel).toHaveText('Manga to discover');
  expect((await mangaLabel.boundingBox()).width).toBeGreaterThan(200);
  await expect(page.getByRole('link', { name: 'Visit DokkaDoki' })).toHaveAttribute('href', 'https://dokkadoki.co.uk/');
});
