import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResultCache } from '../common/cache/result-cache';
import { Page, PageRequest, pageKey, toPage } from '../common/paging/page';
import { exactNameRegExp, NOT_AVAILABLE_PATTERN, orNull } from '../common/text';
import { ConfigService } from '../config/config.service';
import {
  GENE_ROW_PROJECTION,
  GeneRowDoc,
  toGeneSummary,
} from '../genes/genes.mapper';
import { applyPage, GenesService } from '../genes/genes.service';
import { GeneSummary } from '../genes/models/gene.model';
import {
  FLAT_GENE_MODEL,
  FlatGeneDoc,
} from '../genes/schemas/flat-gene.schema';
import {
  SHORT_GENE_MODEL,
  ShortGeneDoc,
} from '../genes/schemas/short-gene.schema';
import { SpeciesIndex } from '../species/species-index.service';
import {
  ComparisonCounts,
  ComparisonPair,
  InheritedGene,
} from './models/comparison.model';

const INHERITED_PROJECTION = {
  _id: 0,
  ptn: 1,
  name: 1,
  pthr: 1,
  descent_ptns: 1,
  descent_gnames: 1,
  descent_longIds: 1,
} as const;

type InheritedRowDoc = Pick<
  FlatGeneDoc,
  | 'ptn'
  | 'name'
  | 'pthr'
  | 'descent_ptns'
  | 'descent_gnames'
  | 'descent_longIds'
>;

/**
 * The three comma-joined descendant columns, zipped into one list. They are
 * split before any sentinel is dropped, so the three stay aligned by position.
 */
export function toInheritedGene(row: InheritedRowDoc): InheritedGene {
  const split = (value: unknown) => String(value ?? '').split(',');
  const names = split(row.descent_gnames);
  const ids = split(row.descent_longIds);
  return {
    ptn: row.ptn,
    name: orNull(row.name),
    familyId: orNull(row.pthr),
    descendants: split(row.descent_ptns).flatMap((raw, index) => {
      const ptn = orNull(raw);
      return ptn === null
        ? []
        : [{ ptn, name: orNull(names[index]), pantherId: orNull(ids[index]) }];
    }),
  };
}

/**
 * Genome comparisons: an ancestral genome against one of its extant
 * descendants. The semantics follow the legacy routes (gene-pass, gene-loss,
 * gene-gain, gene-no-model); the gene-gain filter is corrected.
 */
@Injectable()
export class ComparisonService {
  constructor(
    @InjectModel(SHORT_GENE_MODEL)
    private readonly shortGenes: Model<ShortGeneDoc>,
    @InjectModel(FLAT_GENE_MODEL)
    private readonly flatGenes: Model<FlatGeneDoc>,
    private readonly species: SpeciesIndex,
    private readonly genes: GenesService,
    private readonly cache: ResultCache,
    private readonly config: ConfigService,
  ) {}

  private get timeout(): number {
    return this.config.get('DB_QUERY_TIMEOUT_MS');
  }

  /**
   * Resolves and checks a pair: 404 for an unknown species, 400 unless
   * `extant` is a leaf and `ancestral` one of its ancestors.
   */
  async pair(
    ancestralName: string,
    extantName: string,
  ): Promise<ComparisonPair> {
    const [ancestral, extant] = await Promise.all([
      this.species.require(ancestralName),
      this.species.require(extantName),
    ]);
    if (!extant.isExtant) {
      throw new BadRequestException(
        `"${extant.shortName}" is not an extant species.`,
      );
    }
    if (!extant.ancestors.some((a) => a.shortName === ancestral.shortName)) {
      throw new BadRequestException(
        `"${ancestral.shortName}" is not an ancestor of "${extant.shortName}".`,
      );
    }
    return { ancestral, extant };
  }

  counts(pair: ComparisonPair): Promise<ComparisonCounts> {
    return this.cache.wrap(`comparison-counts:${key(pair)}`, async () => {
      const [inherited, descendants, lost, gained, unmodelled] =
        await Promise.all([
          this.flatGenes
            .countDocuments(this.inheritedFilter(pair))
            .maxTimeMS(this.timeout)
            .exec(),
          this.countDescendants(pair),
          this.flatGenes
            .countDocuments(this.lostFilter(pair))
            .maxTimeMS(this.timeout)
            .exec(),
          this.shortGenes
            .countDocuments(this.gainedFilter(pair))
            .maxTimeMS(this.timeout)
            .exec(),
          this.genes.unmodelledCount(pair.extant),
        ]);
      return { inherited, descendants, lost, gained, unmodelled };
    });
  }

  inherited(
    pair: ComparisonPair,
    page: PageRequest,
  ): Promise<Page<InheritedGene>> {
    const filter = this.inheritedFilter(pair);
    return this.cache.wrap(
      `inherited:${key(pair)}:${pageKey(page)}`,
      async () => {
        const [total, rows] = await Promise.all([
          this.flatGenes.countDocuments(filter).maxTimeMS(this.timeout).exec(),
          applyPage(
            this.flatGenes.find(filter, INHERITED_PROJECTION).sort({ ptn: 1 }),
            page,
          )
            .lean<InheritedRowDoc[]>()
            .maxTimeMS(this.timeout)
            .exec(),
        ]);
        return toPage(rows.map(toInheritedGene), total, page);
      },
    );
  }

  lost(pair: ComparisonPair, page: PageRequest): Promise<Page<GeneSummary>> {
    return this.list(
      `lost:${key(pair)}:${pageKey(page)}`,
      this.flatGenes,
      this.lostFilter(pair),
      page,
      'ancestral',
    );
  }

  gained(pair: ComparisonPair, page: PageRequest): Promise<Page<GeneSummary>> {
    return this.list(
      `gained:${key(pair)}:${pageKey(page)}`,
      this.shortGenes,
      this.gainedFilter(pair),
      page,
      'extant',
    );
  }

  unmodelled(
    pair: ComparisonPair,
    page: PageRequest,
  ): Promise<Page<GeneSummary>> {
    return this.genes.unmodelledGenes(pair.extant.shortName, page);
  }

  private descendantFilter({ ancestral, extant }: ComparisonPair) {
    return {
      species_short: ancestral.shortName,
      descent_spe_short: extant.shortName,
    };
  }

  private inheritedFilter(pair: ComparisonPair) {
    return {
      ...this.descendantFilter(pair),
      descent_ptns: { $not: NOT_AVAILABLE_PATTERN },
    };
  }

  private lostFilter(pair: ComparisonPair) {
    return {
      ...this.descendantFilter(pair),
      descent_ptns: NOT_AVAILABLE_PATTERN,
    };
  }

  /**
   * Extant genes, modelled by a family, whose lineage does not pass through
   * the ancestral genome. The legacy filter was `new RegExp(ancestral)`, so
   * "rosids" also matched "eurosids" and those genes vanished from the list.
   */
  private gainedFilter({ ancestral, extant }: ComparisonPair) {
    return {
      species_short: extant.shortName,
      ancestor_species: { $not: exactNameRegExp(ancestral.shortName) },
      pthr: { $not: NOT_AVAILABLE_PATTERN },
    };
  }

  private async countDescendants(pair: ComparisonPair): Promise<number> {
    const [result] = await this.flatGenes
      .aggregate<{ total: number }>([
        { $match: this.inheritedFilter(pair) },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $size: {
                  $filter: {
                    input: {
                      $split: [{ $ifNull: ['$descent_ptns', ''] }, ','],
                    },
                    cond: { $ne: [{ $trim: { input: '$$this' } }, ''] },
                  },
                },
              },
            },
          },
        },
      ])
      .option({ maxTimeMS: this.timeout })
      .exec();
    return result?.total ?? 0;
  }

  private list<T>(
    cacheKey: string,
    model: Model<T>,
    filter: Record<string, unknown>,
    page: PageRequest,
    kind: 'extant' | 'ancestral',
  ): Promise<Page<GeneSummary>> {
    return this.cache.wrap(cacheKey, async () => {
      const [total, rows] = await Promise.all([
        model.countDocuments(filter).maxTimeMS(this.timeout).exec(),
        applyPage(
          model.find(filter, GENE_ROW_PROJECTION).sort({ ptn: 1 }),
          page,
        )
          .lean<GeneRowDoc[]>()
          .maxTimeMS(this.timeout)
          .exec(),
      ]);
      return toPage(
        rows.map((row) => toGeneSummary(row, kind)),
        total,
        page,
      );
    });
  }
}

function key({ ancestral, extant }: ComparisonPair): string {
  return `${ancestral.shortName}:${extant.shortName}`;
}
