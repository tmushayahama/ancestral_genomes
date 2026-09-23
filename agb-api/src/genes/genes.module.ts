import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpeciesModule } from '../species/species.module';
import { AnnotationsService } from './annotations.service';
import { GenesController, SpeciesGenesController } from './genes.controller';
import {
  GeneResolver,
  ProxyGeneResolver,
  SpeciesGenesResolver,
} from './genes.resolver';
import { GenesService } from './genes.service';
import { FLAT_GENE_MODEL, FlatGeneSchema } from './schemas/flat-gene.schema';
import { GENE_MODEL, GeneSchema } from './schemas/gene.schema';
import { SHORT_GENE_MODEL, ShortGeneSchema } from './schemas/short-gene.schema';

export const GENE_MODELS = MongooseModule.forFeature([
  { name: GENE_MODEL, schema: GeneSchema },
  { name: SHORT_GENE_MODEL, schema: ShortGeneSchema },
  { name: FLAT_GENE_MODEL, schema: FlatGeneSchema },
]);

@Module({
  imports: [GENE_MODELS, SpeciesModule],
  controllers: [GenesController, SpeciesGenesController],
  providers: [
    GenesService,
    AnnotationsService,
    GeneResolver,
    ProxyGeneResolver,
    SpeciesGenesResolver,
  ],
  exports: [GenesService, GENE_MODELS],
})
export class GenesModule {}
