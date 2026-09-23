import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPropertyOptional,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Page } from '../common/paging/page';
import { pageRequest, PagingQueryDto } from '../common/paging/paging-query.dto';
import { Species, SpeciesPage } from '../species/models/species.model';
import { AnnotationsService } from './annotations.service';
import { GenesService } from './genes.service';
import {
  Gene,
  GeneSummary,
  GeneSummaryPage,
  PaintAnnotation,
} from './models/gene.model';

export class SpeciesGenesQueryDto extends PagingQueryDto {
  @ApiPropertyOptional({
    example: 'Homo sapiens',
    description:
      'An extant descendant (short or long name) to show each gene’s descendant in. Omit for each gene’s default proxy.',
  })
  @IsOptional()
  @IsString()
  proxy?: string;
}

@ApiTags('genes')
@Controller('api/genes')
export class GenesController {
  constructor(
    private readonly genes: GenesService,
    private readonly annotations: AnnotationsService,
  ) {}

  @Get(':ptn')
  @ApiOperation({ summary: 'One gene, ancestral or extant' })
  @ApiParam({ name: 'ptn', example: 'PTN000000526' })
  @ApiOkResponse({ type: Gene })
  @ApiNotFoundResponse()
  async gene(@Param('ptn') ptn: string): Promise<Gene> {
    const gene = await this.genes.findGene(ptn);
    if (!gene) {
      throw new NotFoundException(`Gene "${ptn}" not found.`);
    }
    return gene;
  }

  @Get(':ptn/annotations')
  @ApiOperation({ summary: 'GO (PAINT) annotations of a gene' })
  @ApiParam({ name: 'ptn', example: 'PTN000000526' })
  @ApiOkResponse({ type: [PaintAnnotation] })
  @ApiNotFoundResponse()
  @ApiServiceUnavailableResponse({
    description: 'No annotation source is configured.',
  })
  async paintAnnotations(
    @Param('ptn') ptn: string,
  ): Promise<PaintAnnotation[]> {
    const annotations = await this.annotations.forGene(ptn);
    if (annotations === null) {
      throw new NotFoundException(`Gene "${ptn}" not found.`);
    }
    return annotations;
  }
}

@ApiTags('species')
@Controller('api/species')
export class SpeciesGenesController {
  constructor(private readonly genes: GenesService) {}

  @Get(':name/genes')
  @ApiOperation({
    summary: "A species' genome",
    description:
      'Sorted by ptn. Omit `limit` for every gene (the largest list, WHEAT, is 102,802).',
  })
  @ApiParam({ name: 'name', example: 'LUCA' })
  @ApiOkResponse({ type: GeneSummaryPage })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse({
    description: 'The proxy is unknown, not extant, or not a descendant.',
  })
  genesOf(
    @Param('name') name: string,
    @Query() query: SpeciesGenesQueryDto,
  ): Promise<Page<GeneSummary>> {
    return this.genes.speciesGenes(name, query.proxy, pageRequest(query));
  }

  @Get(':name/proxy-species')
  @ApiOperation({
    summary: 'Extant species that can stand in for an ancestral genome',
    description: 'Empty for an extant species.',
  })
  @ApiParam({ name: 'name', example: 'LUCA' })
  @ApiOkResponse({ type: SpeciesPage })
  @ApiNotFoundResponse()
  proxySpecies(@Param('name') name: string): Promise<Page<Species>> {
    return this.genes.proxySpecies(name);
  }

  @Get(':name/unmodelled-genes')
  @ApiOperation({
    summary: 'Genes of an extant species that no PANTHER family models',
  })
  @ApiParam({ name: 'name', example: 'HUMAN' })
  @ApiOkResponse({ type: GeneSummaryPage })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse({ description: 'The species is ancestral.' })
  unmodelled(
    @Param('name') name: string,
    @Query() query: PagingQueryDto,
  ): Promise<Page<GeneSummary>> {
    return this.genes.unmodelledGenes(name, pageRequest(query));
  }
}
