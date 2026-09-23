import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SPECIES_MODEL, SpeciesSchema } from './schemas/species.schema';
import { SpeciesController, StatsController } from './species.controller';
import { SpeciesIndex } from './species-index.service';
import {
  AncestorResolver,
  SpeciesResolver,
  StatsResolver,
} from './species.resolver';

export const SPECIES_MODELS = MongooseModule.forFeature([
  { name: SPECIES_MODEL, schema: SpeciesSchema },
]);

@Module({
  imports: [SPECIES_MODELS],
  controllers: [SpeciesController, StatsController],
  providers: [SpeciesIndex, SpeciesResolver, AncestorResolver, StatsResolver],
  exports: [SpeciesIndex, SPECIES_MODELS],
})
export class SpeciesModule {}
