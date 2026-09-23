import { test, expect } from '@playwright/test';

async function boot(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Boot the game' }).click(); // boot screen
  await page.locator('.splash').click();                              // skip the splash
  await expect(page.getByRole('heading', { name: "Fabric's Quest" })).toBeVisible();
}

test('boot → splash → title → name → look → move → death card', async ({ page }) => {
  await boot(page);
  await page.getByLabel('Your name').fill('Tester');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Score : 0 of 200')).toBeVisible();
  await page.keyboard.press('Enter'); // dismiss the welcome box

  const cmd = page.getByLabel('Command');
  await cmd.fill('look');
  await page.keyboard.press('Enter');
  await expect(page.locator('.textwin')).toContainText('Your cottage');

  await cmd.fill('out');
  await page.keyboard.press('Enter');
  await expect(page.locator('.textwin')).toContainText('VILLAGE SQUARE');

  await cmd.fill('read board');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Score : 5 of 200')).toBeVisible();

  for (const c of ['s', 's', 'drink water']) {
    await cmd.fill(c);
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('dialog')).toContainText('You have died.');
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.locator('.textwin')).toContainText('Game restored');
});

test('the save survives a reload', async ({ page }) => {
  await boot(page);
  await page.getByLabel('Your name').fill('Saver');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.getByLabel('Command').fill('out');
  await page.keyboard.press('Enter');
  await page.reload();
  await page.getByRole('button', { name: 'Boot the game' }).click();
  await page.locator('.splash').click();
  await page.getByRole('button', { name: /Restore Saver's game/ }).click();
  await expect(page.locator('.textwin')).toContainText('VILLAGE SQUARE');
});

test('side quest: sting, flash, green status bar, quip, and exit', async ({ page }) => {
  await boot(page);
  await page.getByLabel('Your name').fill('Tester'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  const cmd = page.getByLabel('Command');
  await cmd.fill('show me a table'); await page.keyboard.press('Enter');
  await expect(page.locator('.play')).toHaveAttribute('data-region', 'excel');
  await expect(page.locator('.play .statusbar')).toHaveCSS('background-color', 'rgb(29, 111, 66)'); // Excel green
  // The Sierra message box (MessageBox) is role="status"; the brief's getByRole('dialog') matches only the death card / title panels.
  await expect(page.getByRole('status')).toContainText('spreadsheet');
  // The goal card (spec2 §2.1) shows first in the same box, the quip under it.
  await expect(page.getByRole('status')).toContainText("JEFF'S EXCEL");
  await page.keyboard.press('Enter');
  await cmd.fill('exit'); await page.keyboard.press('Enter');
  await expect(page.locator('.play')).toHaveAttribute('data-region', 'village');
  await expect(page.locator('.textwin')).toContainText('MY WORKSPACE');
});
