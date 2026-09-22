/**
 * Release figures shown on `/release-info`. They change once per PANTHER
 * release, so they live in data rather than in markup — the Angular version
 * needed a template edit and a redeploy for each bump.
 */
export interface ReleaseInfo {
  pantherVersion: string
  ancestralSpecies: number
  extantSpecies: number
  ancestralGenes: number
  extantGenes: number
}

export const RELEASE_INFO: ReleaseInfo = {
  pantherVersion: '14.1',
  ancestralSpecies: 111,
  extantSpecies: 132,
  ancestralGenes: 1_210_026,
  extantGenes: 2_256_854,
}
