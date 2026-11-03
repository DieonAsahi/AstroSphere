import { expect, test } from '@playwright/test';

test('halaman awal menampilkan AstroSphere', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('AstroSphere')).toBeVisible();
});

test('Mars dapat dipilih dari daftar dan POI Olympus Mons muncul', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Daftar benda langit' }).click();
  await page.getByRole('button', { name: 'Mars', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/planet\/mars$/);
  await expect(
    page.getByRole('button', { name: 'Buka Olympus Mons' }),
  ).toBeVisible();
});
