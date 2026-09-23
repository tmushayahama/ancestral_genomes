import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Page, wholePage } from '../common/paging/page';
import {
  Species,
  SpeciesPage,
  SpeciesTreeNode,
  Stats,
} from './models/species.model';
import { SpeciesIndex } from './species-index.service';

@ApiTags('species')
@Controller('api/species')
export class SpeciesController {
  constructor(private readonly species: SpeciesIndex) {}

  @Get()
  @ApiOperation({
    summary: 'Every species in the tree, flat',
    description:
      'Nest it by `treeParentId`, which also places the subtrees whose stored parent is missing from the data.',
  })
  @ApiOkResponse({ type: SpeciesPage })
  async list(): Promise<Page<Species>> {
    return wholePage(await this.species.all());
  }

  // Declared before ':name' so "tree" is not taken for a species name.
  @Get('tree')
  @ApiOperation({ summary: 'The species tree, nested' })
  @ApiOkResponse({ type: [SpeciesTreeNode] })
  tree(): Promise<SpeciesTreeNode[]> {
    return this.species.tree();
  }

  @Get(':name')
  @ApiOperation({
    summary: 'One species',
    description:
      'By short or long name (e.g. HUMAN or "Homo sapiens"); exact first, then case-insensitive. URL-encode names containing "/" or spaces.',
  })
  @ApiParam({ name: 'name', example: 'HUMAN' })
  @ApiOkResponse({ type: Species })
  @ApiNotFoundResponse({ description: 'No species by that name.' })
  one(@Param('name') name: string): Promise<Species> {
    return this.species.require(name);
  }
}

@ApiTags('stats')
@Controller('api/stats')
export class StatsController {
  constructor(private readonly species: SpeciesIndex) {}

  @Get()
  @ApiOperation({
    summary: 'Release figures',
    description:
      'Species and gene counts, derived from the tree (a species is extant when it has no children).',
  })
  @ApiOkResponse({ type: Stats })
  stats(): Promise<Stats> {
    return this.species.stats();
  }
}
