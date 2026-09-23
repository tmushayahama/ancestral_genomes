import { Module } from '@nestjs/common';
import { GenesModule } from '../genes/genes.module';
import { SpeciesModule } from '../species/species.module';
import { ComparisonResolver } from './comparison.resolver';
import { ComparisonService } from './comparison.service';
import { ComparisonsController } from './comparisons.controller';

@Module({
  imports: [SpeciesModule, GenesModule],
  controllers: [ComparisonsController],
  providers: [ComparisonService, ComparisonResolver],
})
export class ComparisonModule {}
