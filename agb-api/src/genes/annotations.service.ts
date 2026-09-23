import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResultCache } from '../common/cache/result-cache';
import { ConfigService } from '../config/config.service';
import { toPaintAnnotations } from './genes.mapper';
import { PaintAnnotation } from './models/gene.model';
import {
  ANNOTATION_PROJECTION,
  GENE_MODEL,
  GeneDoc,
} from './schemas/gene.schema';

/**
 * GO (PAINT) annotations of a gene.
 *
 * The legacy API scraped pantree.org inside a `request` callback; when the
 * site started answering 403, the unguarded parse threw outside Express and
 * took the whole process down on every ancestral gene view. Nothing here
 * calls out: annotations come from the configured source, and when there is
 * none the request fails on its own with 503.
 */
@Injectable()
export class AnnotationsService {
  constructor(
    @InjectModel(GENE_MODEL) private readonly genes: Model<GeneDoc>,
    private readonly config: ConfigService,
    private readonly cache: ResultCache,
  ) {}

  /** `null` when there is no such gene. */
  async forGene(ptn: string): Promise<PaintAnnotation[] | null> {
    if (this.config.get('PAINT_ANNOTATIONS_SOURCE') === 'none') {
      throw new ServiceUnavailableException(
        'GO annotations are not available: no annotation source is configured.',
      );
    }
    return this.cache.wrap(`annotations:${ptn}`, async () => {
      const doc = await this.genes
        .findOne({ ptn }, ANNOTATION_PROJECTION)
        .lean<GeneDoc>()
        .maxTimeMS(this.config.get('DB_QUERY_TIMEOUT_MS'))
        .exec();
      return doc ? toPaintAnnotations(doc) : null;
    });
  }
}
