import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';
import { SpeciesIndex } from '../species/species-index.service';

/**
 * Reports the integrity problems of the species tree for the data owner:
 * missing parents (and where the API places their subtrees), nodes a naive
 * parent_id walk cannot reach, ages that contradict the tree.
 */
@Injectable()
export class DataCheckCommand {
  constructor(private readonly species: SpeciesIndex) {}

  @Command({
    command: 'data:check',
    describe: 'Report data-integrity problems in the species tree',
  })
  async run(): Promise<void> {
    const report = await this.species.diagnostics();
    const section = (title: string, lines: string[]) => {
      console.log(`\n${title} (${lines.length})`);
      for (const line of lines) {
        console.log(`  ${line}`);
      }
    };

    console.log(`species: ${report.total}`);
    section(
      'Missing parents',
      report.orphans.map(
        (o) =>
          `${o.shortName} (id ${o.id}) -> parent ${o.missingParentId} has no row; placed under ${o.placedUnder ?? '(root)'}`,
      ),
    );
    section('Unreachable from a root by parent_id', report.unreachable);
    section(
      'Internal nodes with timescale 0',
      report.internalWithZeroTimescale,
    );
    section('Unknown timescale', report.unknownTimescale);
    section(
      'Older than their parent',
      report.olderThanParent.map(
        (o) =>
          `${o.shortName} ${o.timescale} mya > ${o.parentShortName} ${o.parentTimescale} mya`,
      ),
    );
    section(
      'Ancestor names with no species row',
      report.missingAncestorNames.map(
        (m) => `${m.name} (in ${m.referencedBy} lineages)`,
      ),
    );
  }
}
