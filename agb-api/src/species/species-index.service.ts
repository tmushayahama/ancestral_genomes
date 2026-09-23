import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from 'winston';
import { ConfigService } from '../config/config.service';
import { WINSTON_MODULE_PROVIDER } from '../winston/winston.constants';
import { Species, SpeciesTreeNode, Stats } from './models/species.model';
import {
  SPECIES_MODEL,
  SPECIES_PROJECTION,
  SpeciesDoc,
} from './schemas/species.schema';
import { SpeciesDiagnostics, SpeciesSnapshot } from './species-snapshot';

/**
 * The species tree, loaded whole (255 rows) and refreshed every
 * `SPECIES_INDEX_TTL_SECONDS`. Every route that names a species resolves it
 * here first, so queries against the gene collections always use the
 * canonical short name.
 */
@Injectable()
export class SpeciesIndex {
  private snapshot?: SpeciesSnapshot;
  private loadedAt = 0;
  private loading?: Promise<SpeciesSnapshot>;

  constructor(
    @InjectModel(SPECIES_MODEL) private readonly model: Model<SpeciesDoc>,
    private readonly config: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async all(): Promise<Species[]> {
    return (await this.current()).list;
  }

  /** By short or long name, exact first, then case-insensitive. */
  async find(name: string): Promise<Species | undefined> {
    return (await this.current()).resolve(name);
  }

  async require(name: string): Promise<Species> {
    const species = await this.find(name);
    if (!species) {
      throw new NotFoundException(`Species "${name}" not found.`);
    }
    return species;
  }

  async byShortName(shortName: string): Promise<Species | undefined> {
    return (await this.current()).byShortName(shortName);
  }

  async byId(id: string): Promise<Species | undefined> {
    return (await this.current()).byId(id);
  }

  async children(id: string): Promise<Species[]> {
    return (await this.current()).children(id);
  }

  async tree(): Promise<SpeciesTreeNode[]> {
    return (await this.current()).tree();
  }

  async stats(): Promise<Stats> {
    return (await this.current()).stats(
      this.config.get('PANTHER_VERSION') ?? null,
    );
  }

  async diagnostics(): Promise<SpeciesDiagnostics> {
    return (await this.current()).diagnostics();
  }

  /** Forget the loaded tree; the next call reloads it. */
  invalidate(): void {
    this.snapshot = undefined;
    this.loadedAt = 0;
  }

  private async current(): Promise<SpeciesSnapshot> {
    const ttlMs = this.config.get('SPECIES_INDEX_TTL_SECONDS') * 1000;
    if (this.snapshot && Date.now() - this.loadedAt < ttlMs) {
      return this.snapshot;
    }
    this.loading ??= this.load().finally(() => {
      this.loading = undefined;
    });
    try {
      return await this.loading;
    } catch (error) {
      // A failed refresh keeps serving the last good tree.
      if (this.snapshot) {
        this.logger.warn('Species reload failed; serving the previous tree', {
          context: 'SpeciesIndex',
          error: String(error),
        });
        return this.snapshot;
      }
      throw error;
    }
  }

  private async load(): Promise<SpeciesSnapshot> {
    const docs = await this.model
      .find({}, SPECIES_PROJECTION)
      .lean<SpeciesDoc[]>()
      .maxTimeMS(this.config.get('DB_QUERY_TIMEOUT_MS'))
      .exec();
    const snapshot = SpeciesSnapshot.fromDocuments(docs);
    this.snapshot = snapshot;
    this.loadedAt = Date.now();
    return snapshot;
  }
}
