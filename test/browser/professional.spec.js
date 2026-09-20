import {test, expect} from '@playwright/test';
for (const width of [320,390,768,1440]) {
 test(`expanded professional section is readable and functional at ${width}px`,async ({page},testInfo)=>{
  await page.setViewportSize({width,height:900});
  await page.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'application/javascript',body:''}));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const section=page.locator('#about');
  await expect(section.locator('.about-copy p')).toHaveCount(2);
  await expect(section).toContainText('work alongside the building fabric');
  const details=section.locator('details');
  await expect(details).toHaveCount(3);
  for(let i=0;i<3;i++){
   const item=details.nth(i);
   if(await item.getAttribute('open')===null) await item.locator('summary').click();
   await expect(item.locator('p')).toHaveCount(2);
   await expect(item.locator('p').last()).toBeVisible();
  }
  await expect(details.nth(2)).toContainText('hot-water requirements');
  const link=section.getByRole('link',{name:'More about my professional background'});
  await expect(link).toHaveAttribute('href','https://uk.linkedin.com/in/richard-chamberlain-577043230');
  await link.click({trial:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await section.locator('*').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)}).map(el=>el.tagName))).toEqual([]);
  await section.screenshot({path:testInfo.outputPath(`professional-${width}.png`)});
 });
}
