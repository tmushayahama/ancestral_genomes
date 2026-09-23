import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Page } from '../common/paging/page';
import { pageRequest, PagingQueryDto } from '../common/paging/paging-query.dto';
import { GeneSummary, GeneSummaryPage } from '../genes/models/gene.model';
import { ComparisonService } from './comparison.service';
import {
  GenomeComparison,
  InheritedGene,
  InheritedGenePage,
} from './models/comparison.model';

@ApiTags('comparisons')
@ApiParam({ name: 'ancestral', example: 'Homo-Pan' })
@ApiParam({ name: 'extant', example: 'HUMAN' })
@ApiNotFoundResponse({ description: 'Either species is unknown.' })
@ApiBadRequestResponse({
  description:
    '`extant` is not extant, or `ancestral` is not one of its ancestors.',
})
@Controller('api/comparisons/:ancestral/:extant')
export class ComparisonsController {
  constructor(private readonly comparisons: ComparisonService) {}

  @Get()
  @ApiOperation({ summary: 'The pair and its gene counts' })
  @ApiOkResponse({ type: GenomeComparison })
  async summary(
    @Param('ancestral') ancestral: string,
    @Param('extant') extant: string,
  ): Promise<GenomeComparison> {
    const pair = await this.comparisons.pair(ancestral, extant);
    return { ...pair, counts: await this.comparisons.counts(pair) };
  }

  @Get('inherited')
  @ApiOperation({
    summary: 'Ancestral genes with descendants in the extant genome',
  })
  @ApiOkResponse({ type: InheritedGenePage })
  async inherited(
    @Param('ancestral') ancestral: string,
    @Param('extant') extant: string,
    @Query() query: PagingQueryDto,
  ): Promise<Page<InheritedGene>> {
    const pair = await this.comparisons.pair(ancestral, extant);
    return this.comparisons.inherited(pair, pageRequest(query));
  }

  @Get('lost')
  @ApiOperation({
    summary: 'Ancestral genes with no descendant in the extant genome',
  })
  @ApiOkResponse({ type: GeneSummaryPage })
  async lost(
    @Param('ancestral') ancestral: string,
    @Param('extant') extant: string,
    @Query() query: PagingQueryDto,
  ): Promise<Page<GeneSummary>> {
    const pair = await this.comparisons.pair(ancestral, extant);
    return this.comparisons.lost(pair, pageRequest(query));
  }

  @Get('gained')
  @ApiOperation({
    summary: 'Extant genes that arose after the ancestral genome',
    description:
      'Modelled extant genes whose lineage does not pass through the ancestral genome. Ancestor names match exactly (the legacy API let "rosids" match "eurosids").',
  })
  @ApiOkResponse({ type: GeneSummaryPage })
  async gained(
    @Param('ancestral') ancestral: string,
    @Param('extant') extant: string,
    @Query() query: PagingQueryDto,
  ): Promise<Page<GeneSummary>> {
    const pair = await this.comparisons.pair(ancestral, extant);
    return this.comparisons.gained(pair, pageRequest(query));
  }
}
