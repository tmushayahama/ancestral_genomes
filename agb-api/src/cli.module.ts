import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { DATA_IMPORTS } from './app/app.module';
import { DataCheckCommand } from './commands/data-check.command';
import { DbIndexesCommand } from './commands/db-indexes.command';
import { GenesModule } from './genes/genes.module';
import { SpeciesModule } from './species/species.module';

/** The data layer and the commands, without the HTTP or GraphQL wiring. */
@Module({
  imports: [...DATA_IMPORTS, CommandModule, SpeciesModule, GenesModule],
  providers: [DbIndexesCommand, DataCheckCommand],
})
export class CliModule {}
