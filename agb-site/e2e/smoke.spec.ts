import { expect, test } from '@playwright/test'

test('home page renders and links into the species browser', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Ancestral Genomes Resource' })).toBeVisible()

  await page
    .getByRole('link', { name: /browse via nested species list view/i })
    .first()
    .click()

  await expect(page).toHaveURL(/\/species\/LUCA/)
})

test('footer links reach the static pages', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: 'Release Information' }).click()

  await expect(page).toHaveURL(/\/release-info/)
  await expect(page.getByText(/PANTHER library version/)).toBeVisible()
})

test('legacy Angular outlet URLs redirect to the new browse route', async ({ page }) => {
  await page.goto('/species/genes/(list:genes/LUCA/default species)')

  await expect(page).toHaveURL(/\/species\/LUCA\?proxy=default(\+|%20)species/)
})
