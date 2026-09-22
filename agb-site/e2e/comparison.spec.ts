import { expect, test } from '@playwright/test'
import { stubAgbApi } from './fixtures/api'

test.beforeEach(async ({ page }) => {
  await stubAgbApi(page)
})

test('comparison: the inherited section is open and counted on arrival', async ({ page }) => {
  await page.goto('/genes/genome-comparison/Homo-Pan/Eukaryota')

  await expect(page.getByRole('heading', { name: 'Compare genomes' })).toBeVisible()
  await expect(page.getByText('genes inherited from')).toBeVisible()
  // The comma-joined descendant column is split into one row per identifier.
  await expect(page.getByText('HUMAN|Ensembl=ENSG00000283697')).toBeVisible()
  await expect(page.getByText('HUMAN|Ensembl=ENSG00000283463')).toBeVisible()
})

test('comparison: the other sections load only when expanded', async ({ page }) => {
  await page.goto('/genes/genome-comparison/Homo-Pan/Eukaryota')
  await expect(page.getByText('HUMAN|Ensembl=ENSG00000283697')).toBeVisible()

  await expect(page.getByText('NOT NAMED')).toBeHidden()

  await page.getByText(/Ancestral genes lost/).click()
  await expect(page.getByText('NOT NAMED')).toBeVisible()

  await page.getByText(/Genes gained other than by duplication/).click()
  await expect(page.getByText('F-BOXWD REPEAT-CONTAINING PROTEIN 1A')).toBeVisible()

  await page.getByText(/no ancestral reconstruction/).click()
  await expect(page.getByText('Putative uncharacterized protein LOC152225')).toBeVisible()
})

test('comparison: species links go back to the browse view', async ({ page }) => {
  await page.goto('/genes/genome-comparison/Homo-Pan/Eukaryota')

  await page.getByRole('link', { name: 'Eukaryota', exact: true }).click()

  await expect(page).toHaveURL(/\/species\/Eukaryota$/)
})

test('gene detail: the standalone page renders the same content as the dialog', async ({
  page,
}) => {
  await page.goto('/genes/PTN000000526')

  await expect(page.getByText('Inferred ancestral protein name')).toBeVisible()
  await expect(page.getByRole('link', { name: 'GO:0016301' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View gene within family tree' })).toHaveAttribute(
    'href',
    '/genes/gene-tree/PTHR10010/PTN000000526'
  )
  await expect(page.getByText('Anolis carolinensis')).toBeVisible()
})

test('expandable tree: renders nodes', async ({ page }) => {
  await page.goto('/species/expandable')

  await expect(page.getByRole('img', { name: 'Expandable species tree' })).toBeVisible()
  await expect(page.locator('svg text', { hasText: 'Eukaryota' })).toBeVisible()
})
