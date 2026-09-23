import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResultCache } from '../common/cache/result-cache';
import {
  Page,
  PageRequest,
  pageKey,
  toPage,
  wholePage,
} from '../common/paging/page';
import { NOT_AVAILABLE_PATTERN } from '../common/text';
import { ConfigService } from '../config/config.service';
import { Species } from '../species/models/species.model';
import { SpeciesIndex } from '../species/species-index.service';
import {
  GENE_ROW_PROJECTION,
  GeneRowDoc,
  toGene,
  toGeneSummary,
} from './genes.mapper';
import { Gene, GeneSummary } from './models/gene.model';
import { FLAT_GENE_MODEL, FlatGeneDoc } from './schemas/flat-gene.schema';
import { GENE_MODEL, GENE_PROJECTION, GeneDoc } from './schemas/gene.schema';
import { SHORT_GENE_MODEL, ShortGeneDoc } from './schemas/short-gene.schema';

/** Skip and limit a query; a `null` limit means every row. */
export function applyPage<
  Q extends { skip(n: number): Q; limit(n: number): Q },
>(query: Q, page: PageRequest): Q {
  const skipped = query.skip(page.offset);
  return page.limit === null ? skipped : skipped.limit(page.limit);
}

/**
 * Genes and gene lists. Every species named in a request is resolved through
 * `SpeciesIndex` first, so the collections are only ever queried by the
 * canonical short name — one indexed field, instead of the legacy `$or` over
 * short and long names that an unindexed branch would turn into a
 * collection scan.
 */
@Injectable()
export class GenesService {
  constructor(
    @InjectModel(GENE_MODEL) private readonly genes: Model<GeneDoc>,
    @InjectModel(SHORT_GENE_MODEL)
    private readonly shortGenes: Model<ShortGeneDoc>,
    @InjectModel(FLAT_GENE_MODEL)
    private readonly flatGenes: Model<FlatGeneDoc>,
    private readonly species: SpeciesIndex,
    private readonly cache: ResultCache,
    private readonly config: ConfigService,
  ) {}

  private get timeout(): number {
    return this.config.get('DB_QUERY_TIMEOUT_MS');
  }

  /** `null` when there is no such gene. */
  findGene(ptn: string): Promise<Gene | null> {
    return this.cache.wrap(`gene:${ptn}`, async () => {
      const doc = await this.genes
        .findOne({ ptn }, GENE_PROJECTION)
        .lean<GeneDoc>()
        .maxTimeMS(this.timeout)
        .exec();
      if (!doc) {
        return null;
      }
      const species = doc.species_short
        ? await this.species.byShortName(doc.species_short)
        : undefined;
      return toGene(doc, species?.isExtant);
    });
  }

  /**
   * A species' genome. Without a proxy, ancestral genes carry their default
   * extant stand-in; with one, their descendant in that species (or null).
   */
  async speciesGenes(
    speciesName: string,
    proxyName: string | undefined,
    page: PageRequest,
  ): Promise<Page<GeneSummary>> {
    const species = await this.species.require(speciesName);
    const proxy =
      proxyName === undefined
        ? undefined
        : await this.proxyFor(species, proxyName);
    const key = `species-genes:${species.shortName}:${proxy?.shortName ?? '-'}:${pageKey(page)}`;

    return this.cache.wrap(key, async () => {
      if (!proxy) {
        const filter = { species_short: species.shortName };
        const [total, rows] = await Promise.all([
          this.shortGenes.countDocuments(filter).maxTimeMS(this.timeout).exec(),
          this.rows(this.shortGenes, filter, page),
        ]);
        const kind = species.isExtant ? 'extant' : 'ancestral';
        return toPage(
          rows.map((row) => toGeneSummary(row, kind)),
          total,
          page,
        );
      }

      const filter = {
        species_short: species.shortName,
        descent_spe_short: proxy.shortName,
      };
      const [total, rows] = await Promise.all([
        this.flatGenes.countDocuments(filter).maxTimeMS(this.timeout).exec(),
        this.rows(this.flatGenes, filter, page),
      ]);
      return toPage(
        rows.map((row) => toGeneSummary(row, 'ancestral')),
        total,
        page,
      );
    });
  }

  /** Extant species that can stand in for an ancestral genome. */
  async proxySpecies(speciesName: string): Promise<Page<Species>> {
    const species = await this.species.require(speciesName);
    if (species.isExtant) {
      return wholePage([]);
    }
    const names = await this.cache.wrap(
      `proxy-species:${species.shortName}`,
      () =>
        this.flatGenes
          .distinct('descent_spe_short', { species_short: species.shortName })
          .maxTimeMS(this.timeout)
          .exec() as Promise<unknown[]>,
    );
    const resolved = await Promise.all(
      names
        .filter(
          (name): name is string => typeof name === 'string' && name !== '',
        )
        .map((name) => this.species.byShortName(name)),
    );
    return wholePage(
      resolved
        .filter((proxy): proxy is Species => proxy !== undefined)
        .sort((a, b) => a.longName.localeCompare(b.longName)),
    );
  }

  /** Genes of an extant species that no PANTHER family models. */
  async unmodelledGenes(
    speciesName: string,
    page: PageRequest,
  ): Promise<Page<GeneSummary>> {
    const species = await this.extantSpecies(speciesName);
    const filter = this.unmodelledFilter(species);
    return this.cache.wrap(
      `unmodelled:${species.shortName}:${pageKey(page)}`,
      async () => {
        const [total, rows] = await Promise.all([
          this.flatGenes.countDocuments(filter).maxTimeMS(this.timeout).exec(),
          this.rows(this.flatGenes, filter, page),
        ]);
        return toPage(
          rows.map((row) => toGeneSummary(row, 'extant')),
          total,
          page,
        );
      },
    );
  }

  unmodelledCount(species: Species): Promise<number> {
    return this.cache.wrap(`unmodelled-count:${species.shortName}`, () =>
      this.flatGenes
        .countDocuments(this.unmodelledFilter(species))
        .maxTimeMS(this.timeout)
        .exec(),
    );
  }

  async extantSpecies(name: string): Promise<Species> {
    const species = await this.species.require(name);
    if (!species.isExtant) {
      throw new BadRequestException(
        `"${species.shortName}" is an ancestral genome; unmodelled genes are listed for extant species.`,
      );
    }
    return species;
  }

  private unmodelledFilter(species: Species) {
    return { species_short: species.shortName, pthr: NOT_AVAILABLE_PATTERN };
  }

  private async proxyFor(
    species: Species,
    proxyName: string,
  ): Promise<Species> {
    if (species.isExtant) {
      throw new BadRequestException(
        `"${species.shortName}" is an extant species; proxies apply to ancestral genomes.`,
      );
    }
    const proxy = await this.species.find(proxyName);
    if (!proxy) {
      throw new BadRequestException(`Proxy species "${proxyName}" not found.`);
    }
    if (!proxy.isExtant) {
      throw new BadRequestException(
        `Proxy "${proxy.shortName}" is not an extant species.`,
      );
    }
    if (!proxy.ancestors.some((a) => a.shortName === species.shortName)) {
      throw new BadRequestException(
        `"${proxy.shortName}" does not descend from "${species.shortName}".`,
      );
    }
    return proxy;
  }

  private rows<T>(
    model: Model<T>,
    filter: Record<string, unknown>,
    page: PageRequest,
  ): Promise<GeneRowDoc[]> {
    return applyPage(
      model.find(filter, GENE_ROW_PROJECTION).sort({ ptn: 1 }),
      page,
    )
      .lean<GeneRowDoc[]>()
      .maxTimeMS(this.timeout)
      .exec();
  }
}
