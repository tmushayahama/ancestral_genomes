import { expect, test } from '@playwright/test'

/**
 * Smoke tests against the real AGB API at `VITE_AGB_API_URL`. Skipped unless
 * `AGB_LIVE=1`, so the default suite stays hermetic and CI does not depend on
 * an external host.
 *
 *   AGB_LIVE=1 npx playwright test e2e/live.spec.ts
 */
test.skip(process.env.AGB_LIVE !== '1', 'set AGB_LIVE=1 to run against the real API')

test.describe.configure({ mode: 'serial' })

test('live: the species tree loads the real hierarchy', async ({ page }) => {
  await page.goto('/species/LUCA')

  await expect(page.getByRole('treeitem').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Eubacteria', { exact: true })).toBeVisible()
  await expect(page.getByText('Eukaryota', { exact: true })).toBeVisible()
})

test('live: the LUCA gene list loads and filters', async ({ page }) => {
  await page.goto('/species/LUCA')

  await expect(page.getByText(/PTN0000000/).first()).toBeVisible({ timeout: 60_000 })
  await expect(page.getByPlaceholder(/Filter 3,018 genes in LUCA/)).toBeVisible()

  await page.getByLabel('Filter rows').fill('SUPEROXIDE')
  await expect(page.getByText(/SUPEROXIDE/).first()).toBeVisible()
})

test('live: the proxy species picker is populated and changes the list', async ({ page }) => {
  await page.goto('/species/LUCA')
  await expect(page.getByText(/PTN0000000/).first()).toBeVisible({ timeout: 60_000 })

  await page.getByRole('combobox', { name: 'Proxy species' }).click()
  await page.getByRole('option', { name: 'Homo sapiens' }).click()

  await expect(page).toHaveURL(/proxy=Homo(\+|%20)sapiens/)
  // An uncached species/proxy pair takes ~9s from the API; apicache holds it
  // for two hours afterwards.
  await expect(page.getByText('Proxy gene in Homo sapiens')).toBeVisible({ timeout: 60_000 })
})

test('live: a gene preview shows the real sequence and proxy genes', async ({ page }) => {
  await page.goto('/genes/PTN000000526')

  await expect(page.getByText('Inferred ancestral protein name')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Proxy genes in extant species')).toBeVisible()
  await expect(page.getByRole('link', { name: 'PTHR10010' })).toBeVisible()
})

test('live: an extant species detail lists its ancestral genomes', async ({ page }) => {
  await page.goto('/species/HUMAN/info')

  await expect(page.getByText('Ancestral genomes of Homo sapiens')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('link', { name: 'Homo-Pan' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'compare with Homo sapiens' }).first()).toBeVisible()
})

test('live: the genome comparison loads real counts', async ({ page }) => {
  await page.goto('/genes/genome-comparison/HUMAN/Homo-Pan')

  await expect(page.getByText('genes inherited from')).toBeVisible({ timeout: 120_000 })
  await expect(page.getByText(/PTN0/).first()).toBeVisible({ timeout: 120_000 })

  await page.getByText(/Genes gained other than by duplication/).click()
  await expect(page.getByText('F-BOXWD REPEAT-CONTAINING PROTEIN 1A')).toBeVisible({
    timeout: 60_000,
  })
})

test('live: GO annotations degrade gracefully while the scrape endpoint is down', async ({
  page,
}) => {
  await page.goto('/genes/PTN000000526')

  await expect(page.getByText('Gene Ontology annotations to this ancestral gene')).toBeVisible({
    timeout: 30_000,
  })
  // `/genelist/gene_go/:ptn` currently closes the connection without replying
  // (pantree.org 403s and the API's scrape does not guard), so this must show a
  // message rather than spin forever.
  await expect(page.getByText(/GO annotations are unavailable|No GO annotations/)).toBeVisible({
    timeout: 60_000,
  })
})
