import { expect, test } from '@playwright/test'
import { stubAgbApi } from './fixtures/api'

const FIRST_GENE = 'PTN000000526'

test.beforeEach(async ({ page }) => {
  await stubAgbApi(page)
})

test('browse: species tree and gene list load side by side', async ({ page }) => {
  await page.goto('/species/LUCA')

  await expect(page.getByRole('treeitem').first()).toBeVisible()
  await expect(page.getByText('Eukaryota', { exact: true })).toBeVisible()
  await expect(page.getByText(FIRST_GENE)).toBeVisible()
})

test('browse: selecting a species in the tree navigates and reloads the list', async ({ page }) => {
  await page.goto('/species/LUCA')
  await expect(page.getByText(FIRST_GENE)).toBeVisible()

  await page.getByRole('treeitem').filter({ hasText: 'Eukaryota' }).first().click()

  await expect(page).toHaveURL(/\/species\/Eukaryota$/)
})

test('browse: changing the proxy species writes it to the query string', async ({ page }) => {
  await page.goto('/species/LUCA')
  await expect(page.getByText(FIRST_GENE)).toBeVisible()

  // Mantine gives the input and its listbox the same aria-label, so target the role.
  await page.getByRole('combobox', { name: 'Proxy species' }).click()
  await page.getByRole('option', { name: 'Mus musculus' }).click()

  await expect(page).toHaveURL(/proxy=Mus(\+|%20)musculus/)
  await expect(page.getByText('Proxy gene in Mus musculus')).toBeVisible()
})

test('browse: clicking a gene row opens the preview dialog', async ({ page }) => {
  await page.goto('/species/LUCA')

  await page.getByText(FIRST_GENE).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Inferred ancestral protein name')).toBeVisible()
  // Sequence padding is stripped and the residues upper-cased.
  await expect(dialog.getByText('MKVLLGAE')).toBeVisible()
  // `longId` is the NOT_AVAILABE sentinel for an ancestral gene, so the protein
  // name must render as plain text rather than a PANTHER link.
  await expect(dialog.getByRole('link', { name: /SODIUM-DEPENDENT/ })).toHaveCount(0)
})

test('browse: the tree row info button opens the species dialog', async ({ page }) => {
  await page.goto('/species/LUCA')

  await page.getByRole('button', { name: 'Information about Homo-Pan' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Ancestral genomes of Homo-Pan')).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'compare with Homo-Pan' })).toHaveAttribute(
    'href',
    '/genes/genome-comparison/Homo-Pan/Eukaryota'
  )
})

test('browse: the tree collapses and expands', async ({ page }) => {
  await page.goto('/species/LUCA')
  await expect(page.getByText('Homo-Pan', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Collapse Eukaryota' }).click()
  await expect(page.getByText('Homo-Pan', { exact: true })).toBeHidden()

  await page.getByRole('button', { name: 'Expand Eukaryota' }).click()
  await expect(page.getByText('Homo-Pan', { exact: true })).toBeVisible()
})
