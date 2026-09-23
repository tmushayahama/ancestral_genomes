import {
  Args,
  ArgsType,
  Field,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';
import { Page } from '../common/paging/page';
import {
  graphqlPageRequest,
  listComplexity,
  pagedComplexity,
  PagingArgs,
} from '../common/paging/paging.args';
import { ConfigService } from '../config/config.service';
import { Species } from '../species/models/species.model';
import { SpeciesIndex } from '../species/species-index.service';
import { AnnotationsService } from './annotations.service';
import { GenesService } from './genes.service';
import {
  Gene,
  GeneSummary,
  GeneSummaryPage,
  PaintAnnotation,
  ProxyGene,
} from './models/gene.model';

@ArgsType()
export class SpeciesGenesArgs extends PagingArgs {
  @Field(() => String, {
    nullable: true,
    description:
      'An extant descendant to show each gene’s descendant in; omit for default proxies.',
  })
  @IsOptional()
  @IsString()
  proxy?: string;
}

@Resolver(() => Gene)
export class GeneResolver {
  constructor(
    private readonly genesService: GenesService,
    private readonly annotations: AnnotationsService,
    private readonly speciesIndex: SpeciesIndex,
  ) {}

  @Query(() => Gene, { nullable: true })
  gene(@Args('ptn', { type: () => ID }) ptn: string): Promise<Gene | null> {
    return this.genesService.findGene(ptn);
  }

  @ResolveField(() => Species, { nullable: true })
  async species(@Parent() gene: Gene): Promise<Species | null> {
    return (await this.speciesIndex.byShortName(gene.speciesShortName)) ?? null;
  }

  // Nullable on purpose: when no annotation source is configured this field
  // errors on its own and the rest of the gene still resolves.
  @ResolveField(() => [PaintAnnotation], {
    nullable: true,
    description: 'GO (PAINT) annotations; errors when no source is configured.',
  })
  paintAnnotations(@Parent() gene: Gene): Promise<PaintAnnotation[] | null> {
    return this.annotations.forGene(gene.ptn);
  }
}

@Resolver(() => ProxyGene)
export class ProxyGeneResolver {
  constructor(private readonly speciesIndex: SpeciesIndex) {}

  @ResolveField(() => Species, { nullable: true })
  async species(@Parent() proxy: ProxyGene): Promise<Species | null> {
    return (
      (await this.speciesIndex.byShortName(proxy.speciesShortName)) ?? null
    );
  }
}

/** The gene-list fields of `Species`, kept here to avoid a module cycle. */
@Resolver(() => Species)
export class SpeciesGenesResolver {
  constructor(
    private readonly genesService: GenesService,
    private readonly config: ConfigService,
  ) {}

  @ResolveField(() => GeneSummaryPage, { complexity: pagedComplexity })
  genes(
    @Parent() species: Species,
    @Args() args: SpeciesGenesArgs,
  ): Promise<Page<GeneSummary>> {
    return this.genesService.speciesGenes(
      species.shortName,
      args.proxy ?? undefined,
      graphqlPageRequest(args, this.config.get('GRAPHQL_MAX_PAGE_SIZE')),
    );
  }

  @ResolveField(() => [Species], {
    description: 'Extant species that can stand in for this ancestral genome.',
    complexity: listComplexity(150),
  })
  async proxySpecies(@Parent() species: Species): Promise<Species[]> {
    return (await this.genesService.proxySpecies(species.shortName)).items;
  }

  @ResolveField(() => GeneSummaryPage, {
    nullable: true,
    description: 'Genes no PANTHER family models; null for ancestral genomes.',
    complexity: pagedComplexity,
  })
  async unmodelledGenes(
    @Parent() species: Species,
    @Args() args: PagingArgs,
  ): Promise<Page<GeneSummary> | null> {
    if (!species.isExtant) {
      return null;
    }
    return this.genesService.unmodelledGenes(
      species.shortName,
      graphqlPageRequest(args, this.config.get('GRAPHQL_MAX_PAGE_SIZE')),
    );
  }
}
