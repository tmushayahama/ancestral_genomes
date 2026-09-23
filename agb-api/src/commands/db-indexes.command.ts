import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Command } from 'nestjs-command';
import { FLAT_GENE_MODEL } from '../genes/schemas/flat-gene.schema';
import { GENE_MODEL } from '../genes/schemas/gene.schema';
import { SHORT_GENE_MODEL } from '../genes/schemas/short-gene.schema';

/**
 * Creates the indexes declared on the schemas. The app never builds indexes
 * itself (`autoIndex: false`), so a boot cannot start a multi-minute build on
 * production; run this deliberately, in a quiet window. It only creates —
 * existing indexes are left alone, and nothing is ever dropped.
 */
@Injectable()
export class DbIndexesCommand {
  constructor(
    @InjectModel(GENE_MODEL) private readonly genes: Model<unknown>,
    @InjectModel(SHORT_GENE_MODEL) private readonly shortGenes: Model<unknown>,
    @InjectModel(FLAT_GENE_MODEL) private readonly flatGenes: Model<unknown>,
  ) {}

  @Command({
    command: 'db:indexes',
    describe: 'Create the indexes the API relies on (idempotent, never drops)',
  })
  async run(): Promise<void> {
    for (const model of [this.genes, this.shortGenes, this.flatGenes]) {
      const started = Date.now();
      await model.createIndexes();
      const keys = model.schema
        .indexes()
        .map(([fields]) => JSON.stringify(fields));
      console.log(
        `${model.collection.collectionName}: ${keys.join(', ')} (${Date.now() - started} ms)`,
      );
    }
  }
}
