/**
 * A miniature of `ancGenomesDB15`, in the raw shapes the live API returned on
 * 2026-09-22: numeric columns as text, `parent_id: ""` for the root, the
 * `NOT_AVAILABLE` / `NOT_AVAILABE` / `NOT NAMED` sentinels, and comma-joined
 * descendant columns.
 *
 * It deliberately includes the defects found in the real data:
 * - malvids points at parent 254 (eurosids), which has no row;
 * - eudicotyledons is an internal node stored with timescale "0";
 * - SAR/HA_supergroup has a slash in its name and an empty taxon_id;
 * - ARATH gene PTN007000002 arose at eurosids, the case the legacy
 *   `new RegExp('rosids')` gene-gain filter got wrong.
 *
 * `ancestor_species` is stored comma-joined here. The real delimiter is not
 * verified yet; the filter accepts any delimiter (see `exactNameRegExp`).
 */

type Row = Record<string, unknown>;

const species = (
  id: string,
  shortName: string,
  longName: string,
  parentId: string,
  parentShortName: string,
  timescale: string,
  geneCount: string,
  taxonId: string,
  ancestors: Array<[string, string]>,
): Row => ({
  id,
  short_name: shortName,
  long_name: longName,
  taxon_id: taxonId,
  timescale,
  gene_count: geneCount,
  parent_id: parentId,
  parent_short_name: parentShortName,
  all_ancestors: ancestors,
  // Present in the real documents and excluded by the legacy projection.
  conversion: '1',
  common_name: '',
});

const LUCA: [string, string] = ['4290', 'LUCA'];
const EUK: [string, string] = ['2101', 'Eukaryota'];

export const SPECIES: Row[] = [
  species('1', 'LUCA', 'LUCA', '', '', '4290', '4', '131567', []),
  species('2', 'Eukaryota', 'Eukaryota', '1', 'LUCA', '2101', '3', '2759', [
    LUCA,
  ]),
  species(
    '3',
    'Homo-Pan',
    'Homo-Pan',
    '2',
    'Eukaryota',
    '6.65',
    '3',
    '207598',
    [EUK, LUCA],
  ),
  species('4', 'HUMAN', 'Homo sapiens', '3', 'Homo-Pan', '0', '5', '9606', [
    ['6.65', 'Homo-Pan'],
    EUK,
    LUCA,
  ]),
  species('5', 'PANTR', 'Pan troglodytes', '3', 'Homo-Pan', '0', '2', '9598', [
    ['6.65', 'Homo-Pan'],
    EUK,
    LUCA,
  ]),
  species('6', 'rosids', 'rosids', '2', 'Eukaryota', '110', '2', '71275', [
    EUK,
    LUCA,
  ]),
  // Parent 254 (eurosids) is missing from the collection, as in the real data.
  species('7', 'malvids', 'malvids', '254', '', '99', '2', '91836', [
    ['', 'eurosids'],
    ['110', 'rosids'],
    EUK,
    LUCA,
  ]),
  species(
    '8',
    'ARATH',
    'Arabidopsis thaliana',
    '7',
    'malvids',
    '0',
    '4',
    '3702',
    [['', 'eurosids'], ['99', 'malvids'], ['110', 'rosids'], EUK, LUCA],
  ),
  species(
    '9',
    'eudicotyledons',
    'eudicotyledons',
    '2',
    'Eukaryota',
    '0',
    '1',
    '71240',
    [EUK, LUCA],
  ),
  species(
    '10',
    'VITVI',
    'Vitis vinifera',
    '9',
    'eudicotyledons',
    '0',
    '1',
    '29760',
    [['0', 'eudicotyledons'], EUK, LUCA],
  ),
  species(
    '11',
    'SAR/HA_supergroup',
    'SAR/HA_supergroup',
    '2',
    'Eukaryota',
    '1768',
    '1',
    '',
    [EUK, LUCA],
  ),
  species(
    '12',
    'PLAF7',
    'Plasmodium falciparum (isolate 3D7)',
    '11',
    'SAR/HA_supergroup',
    '0',
    '1',
    '36329',
    [['1768', 'SAR/HA_supergroup'], EUK, LUCA],
  ),
];

const HUMAN_SLC34A2 = 'HUMAN|HGNC=11019|UniProtKB=Q06495';

export const GENES: Row[] = [
  {
    ptn: 'PTN000000526',
    name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2C-RELATED',
    species_short: 'LUCA',
    species_long: 'LUCA',
    event: 'SPECIATION',
    sequence: 'mkv..llg--ae_',
    pthr: 'PTHR10010',
    family_name: 'SOLUTE CARRIER FAMILY 34',
    longId: 'NOT_AVAILABE',
    paint_annotations: [],
    direct_paint_annotations: [],
    inherited_paint_annotations: [],
    proxy_genes: [
      {
        proxy_spe_short: 'HUMAN',
        proxy_spe_long: 'Homo sapiens',
        proxy_gene: HUMAN_SLC34A2,
      },
      {
        proxy_spe_short: 'ARATH',
        proxy_spe_long: 'Arabidopsis thaliana',
        proxy_gene: 'ARATH|TAIR=AT1G00001|UniProtKB=Q00001',
      },
    ],
  },
  {
    ptn: 'PTN000000538',
    name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2A',
    species_short: 'Homo-Pan',
    species_long: 'Homo-Pan',
    event: 'SPECIATION',
    sequence: 'MSSP',
    pthr: 'PTHR10010',
    family_name: 'SOLUTE CARRIER FAMILY 34',
    longId: 'NOT_AVAILABE',
    paint_annotations: [],
    direct_paint_annotations: [
      {
        go_accession: 'GO:0005315',
        go_name: 'inorganic phosphate transmembrane transporter activity',
      },
    ],
    inherited_paint_annotations: [
      { go_accession: 'GO:0006817', go_name: 'phosphate ion transport' },
      {
        go_accession: 'GO:0000001',
        go_name: '(NOT) mitochondrion inheritance',
      },
    ],
    proxy_genes: [
      {
        proxy_spe_short: 'HUMAN',
        proxy_spe_long: 'Homo sapiens',
        proxy_gene: HUMAN_SLC34A2,
      },
    ],
  },
  {
    ptn: 'PTN002467165',
    name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2A',
    species_short: 'HUMAN',
    species_long: 'Homo sapiens',
    event: '',
    sequence: 'MSSPNMLLGA',
    pthr: 'PTHR10010',
    family_name: 'SOLUTE CARRIER FAMILY 34',
    longId: HUMAN_SLC34A2,
    paint_annotations: [],
    direct_paint_annotations: [],
    inherited_paint_annotations: [],
    proxy_genes: [],
  },
  {
    ptn: 'PTN900000717',
    name: 'NOT NAMED',
    species_short: 'Homo-Pan',
    species_long: 'Homo-Pan',
    event: 'DUPLICATION',
    sequence: 'MA',
    pthr: 'PTHR10030',
    family_name: 'UNCHARACTERIZED',
    longId: 'NOT_AVAILABE',
    paint_annotations: [],
    direct_paint_annotations: [],
    inherited_paint_annotations: [],
    proxy_genes: [],
  },
];

const short = (
  speciesShort: string,
  speciesLong: string,
  ptn: string,
  name: string,
  pthr: string,
  proxyGene: string,
  ancestorSpecies: string,
): Row => ({
  ptn,
  name,
  pthr,
  proxy_gene: proxyGene,
  species_short: speciesShort,
  species_long: speciesLong,
  ancestor_species: ancestorSpecies,
});

export const SHORT_GENES: Row[] = [
  // LUCA's genome with each gene's default proxy.
  short(
    'LUCA',
    'LUCA',
    'PTN000000526',
    'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2C-RELATED',
    'PTHR10010',
    HUMAN_SLC34A2,
    '',
  ),
  short(
    'LUCA',
    'LUCA',
    'PTN000000084',
    'MANNOSYL-3-PHOSPHOGLYCERATE PHOSPHATASE',
    'PTHR10000',
    'SCHPO|PomBase=SPBC215.10|UniProtKB=O94314',
    '',
  ),
  short(
    'LUCA',
    'LUCA',
    'PTN000003242',
    'ATP SYNTHASE, SUBUNIT C',
    'PTHR10031',
    'ARATH|TAIR=AT2G00002|UniProtKB=Q00002',
    '',
  ),
  short(
    'LUCA',
    'LUCA',
    'PTN000004000',
    'NOT NAMED',
    'PTHR10099',
    'NOT_AVAILABLE',
    '',
  ),

  // Human: inherited, gained (H4) and unmodelled (H5) genes.
  short(
    'HUMAN',
    'Homo sapiens',
    'PTN002467165',
    'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2A',
    'PTHR10010',
    HUMAN_SLC34A2,
    'Homo-Pan,Eukaryota,LUCA',
  ),
  short(
    'HUMAN',
    'Homo sapiens',
    'PTN002558327',
    'HEAT SHOCK FACTOR X 3',
    'PTHR10015',
    'HUMAN|Ensembl=ENSG00000283697',
    'Homo-Pan,Eukaryota',
  ),
  short(
    'HUMAN',
    'Homo sapiens',
    'PTN002558326',
    'HEAT SHOCK FACTOR X 4',
    'PTHR10015',
    'HUMAN|Ensembl=ENSG00000283463',
    'Homo-Pan,Eukaryota',
  ),
  short(
    'HUMAN',
    'Homo sapiens',
    'PTN002542101',
    'F-BOXWD REPEAT-CONTAINING PROTEIN 1A',
    'PTHR10020',
    'HUMAN|HGNC=1144|UniProtKB=Q9Y297',
    '',
  ),
  short(
    'HUMAN',
    'Homo sapiens',
    'PTN006873414',
    'Putative uncharacterized protein LOC152225',
    'NOT_AVAILABLE',
    'HUMAN|Gene=YC023_HUMAN|UniProtKB=Q0VG73',
    '',
  ),

  // Arabidopsis: A2 arose at eurosids, after rosids. "Gained since rosids"
  // must include it; the legacy regex /rosids/ matched "eurosids" and dropped it.
  short(
    'ARATH',
    'Arabidopsis thaliana',
    'PTN007000001',
    'PROTEIN A1',
    'PTHR20001',
    'ARATH|TAIR=AT1G01010|UniProtKB=Q0A001',
    'malvids,rosids,Eukaryota,LUCA',
  ),
  short(
    'ARATH',
    'Arabidopsis thaliana',
    'PTN007000002',
    'PROTEIN A2',
    'PTHR20002',
    'ARATH|TAIR=AT1G01020|UniProtKB=Q0A002',
    'eurosids,malvids',
  ),
  short(
    'ARATH',
    'Arabidopsis thaliana',
    'PTN007000003',
    'PROTEIN A3',
    'PTHR20003',
    'ARATH|TAIR=AT1G01030|UniProtKB=Q0A003',
    '',
  ),
  short(
    'ARATH',
    'Arabidopsis thaliana',
    'PTN007000004',
    'PROTEIN A4',
    'NOT_AVAILABLE',
    'ARATH|TAIR=AT1G01040|UniProtKB=Q0A004',
    '',
  ),
];

const flat = (row: Row): Row => ({
  event: 'SPECIATION',
  species_long: row.species_short,
  ...row,
});

export const FLAT_GENES: Row[] = [
  // Homo-Pan → HUMAN: two inherited genes (one duplicated into two) and one lost.
  flat({
    ptn: 'PTN000000538',
    name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2A',
    pthr: 'PTHR10010',
    species_short: 'Homo-Pan',
    descent_spe_short: 'HUMAN',
    descent_spe_long: 'Homo sapiens',
    proxy_gene: HUMAN_SLC34A2,
    descent_ptns: 'PTN002467165',
    descent_gnames: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2A',
    descent_longIds: HUMAN_SLC34A2,
  }),
  flat({
    ptn: 'PTN004119341',
    name: 'HEAT SHOCK TRANSCRIPTION FACTOR X-LINKED MEMBER 4-RELATED',
    pthr: 'PTHR10015',
    species_short: 'Homo-Pan',
    descent_spe_short: 'HUMAN',
    descent_spe_long: 'Homo sapiens',
    proxy_gene: 'HUMAN|Ensembl=ENSG00000283697',
    descent_ptns: 'PTN002558327,PTN002558326',
    descent_gnames: 'HEAT SHOCK FACTOR X 3,HEAT SHOCK FACTOR X 4',
    descent_longIds:
      'HUMAN|Ensembl=ENSG00000283697,HUMAN|Ensembl=ENSG00000283463',
  }),
  flat({
    ptn: 'PTN900000717',
    name: 'NOT NAMED',
    pthr: 'PTHR10030',
    species_short: 'Homo-Pan',
    descent_spe_short: 'HUMAN',
    descent_spe_long: 'Homo sapiens',
    proxy_gene: 'NOT_AVAILABLE',
    descent_ptns: 'NOT_AVAILABLE',
    descent_gnames: 'NOT_AVAILABLE',
    descent_longIds: 'NOT_AVAILABLE',
  }),
  // Homo-Pan → PANTR, so Homo-Pan has two proxy species.
  flat({
    ptn: 'PTN000000538',
    name: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2A',
    pthr: 'PTHR10010',
    species_short: 'Homo-Pan',
    descent_spe_short: 'PANTR',
    descent_spe_long: 'Pan troglodytes',
    proxy_gene: 'PANTR|Ensembl=ENSPTRG00000000001',
    descent_ptns: 'PTN003000001',
    descent_gnames: 'SODIUM-DEPENDENT PHOSPHATE TRANSPORT PROTEIN 2A',
    descent_longIds: 'PANTR|Ensembl=ENSPTRG00000000001',
  }),
  // LUCA → HUMAN: the proxy view of LUCA's genome in human.
  ...['PTN000000526', 'PTN000000084', 'PTN000003242', 'PTN000004000'].map(
    (ptn) =>
      flat({
        ptn,
        name: ptn === 'PTN000004000' ? 'NOT NAMED' : `LUCA GENE ${ptn}`,
        pthr: 'PTHR10000',
        species_short: 'LUCA',
        descent_spe_short: 'HUMAN',
        descent_spe_long: 'Homo sapiens',
        proxy_gene: ptn === 'PTN000000526' ? HUMAN_SLC34A2 : 'NOT_AVAILABLE',
        descent_ptns: ptn === 'PTN000000526' ? 'PTN002467165' : 'NOT_AVAILABLE',
        descent_gnames: 'NOT_AVAILABLE',
        descent_longIds: 'NOT_AVAILABLE',
      }),
  ),
  // LUCA → ARATH.
  flat({
    ptn: 'PTN000003242',
    name: 'ATP SYNTHASE, SUBUNIT C',
    pthr: 'PTHR10031',
    species_short: 'LUCA',
    descent_spe_short: 'ARATH',
    descent_spe_long: 'Arabidopsis thaliana',
    proxy_gene: 'ARATH|TAIR=AT2G00002|UniProtKB=Q00002',
    descent_ptns: 'PTN007000009',
    descent_gnames: 'ATP SYNTHASE, SUBUNIT C',
    descent_longIds: 'ARATH|TAIR=AT2G00002|UniProtKB=Q00002',
  }),
  // rosids → ARATH and malvids → ARATH.
  flat({
    ptn: 'PTN005000001',
    name: 'PROTEIN A1 ANCESTOR',
    pthr: 'PTHR20001',
    species_short: 'rosids',
    descent_spe_short: 'ARATH',
    descent_spe_long: 'Arabidopsis thaliana',
    proxy_gene: 'ARATH|TAIR=AT1G01010|UniProtKB=Q0A001',
    descent_ptns: 'PTN007000001',
    descent_gnames: 'PROTEIN A1',
    descent_longIds: 'ARATH|TAIR=AT1G01010|UniProtKB=Q0A001',
  }),
  flat({
    ptn: 'PTN006000001',
    name: 'PROTEIN A1 ANCESTOR',
    pthr: 'PTHR20001',
    species_short: 'malvids',
    descent_spe_short: 'ARATH',
    descent_spe_long: 'Arabidopsis thaliana',
    proxy_gene: 'ARATH|TAIR=AT1G01010|UniProtKB=Q0A001',
    descent_ptns: 'PTN007000001',
    descent_gnames: 'PROTEIN A1',
    descent_longIds: 'ARATH|TAIR=AT1G01010|UniProtKB=Q0A001',
  }),
  flat({
    ptn: 'PTN006000002',
    name: 'PROTEIN A2 ANCESTOR',
    pthr: 'PTHR20002',
    species_short: 'malvids',
    descent_spe_short: 'ARATH',
    descent_spe_long: 'Arabidopsis thaliana',
    proxy_gene: 'ARATH|TAIR=AT1G01020|UniProtKB=Q0A002',
    descent_ptns: 'PTN007000002',
    descent_gnames: 'PROTEIN A2',
    descent_longIds: 'ARATH|TAIR=AT1G01020|UniProtKB=Q0A002',
  }),
  // Unmodelled human gene: an extant row with no family and no descendants.
  {
    ptn: 'PTN006873414',
    name: 'Putative uncharacterized protein LOC152225',
    pthr: 'NOT_AVAILABLE',
    species_short: 'HUMAN',
    species_long: 'Homo sapiens',
    proxy_gene: 'HUMAN|Gene=YC023_HUMAN|UniProtKB=Q0VG73',
    descent_ptns: 'NOT_AVAILABLE',
  },
];
