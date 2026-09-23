import { NotFoundException } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Page } from '../common/paging/page';
import {
  graphqlPageRequest,
  pagedComplexity,
  PagingArgs,
} from '../common/paging/paging.args';
import { ConfigService } from '../config/config.service';
import { GeneSummary, GeneSummaryPage } from '../genes/models/gene.model';
import { ComparisonService } from './comparison.service';
import {
  ComparisonCounts,
  ComparisonPair,
  GenomeComparison,
  InheritedGene,
  InheritedGenePage,
} from './models/comparison.model';

@Resolver(() => GenomeComparison)
export class ComparisonResolver {
  constructor(
    private readonly comparisons: ComparisonService,
    private readonly config: ConfigService,
  ) {}

  @Query(() => GenomeComparison, {
    nullable: true,
    description:
      'null when either species is unknown; an error when extant is not extant or ancestral is not one of its ancestors.',
  })
  async comparison(
    @Args('ancestral') ancestral: string,
    @Args('extant') extant: string,
  ): Promise<ComparisonPair | null> {
    try {
      return await this.comparisons.pair(ancestral, extant);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @ResolveField(() => ComparisonCounts)
  counts(@Parent() pair: ComparisonPair): Promise<ComparisonCounts> {
    return this.comparisons.counts(pair);
  }

  @ResolveField(() => InheritedGenePage, { complexity: pagedComplexity })
  inherited(
    @Parent() pair: ComparisonPair,
    @Args() args: PagingArgs,
  ): Promise<Page<InheritedGene>> {
    return this.comparisons.inherited(pair, this.page(args));
  }

  @ResolveField(() => GeneSummaryPage, { complexity: pagedComplexity })
  lost(
    @Parent() pair: ComparisonPair,
    @Args() args: PagingArgs,
  ): Promise<Page<GeneSummary>> {
    return this.comparisons.lost(pair, this.page(args));
  }

  @ResolveField(() => GeneSummaryPage, { complexity: pagedComplexity })
  gained(
    @Parent() pair: ComparisonPair,
    @Args() args: PagingArgs,
  ): Promise<Page<GeneSummary>> {
    return this.comparisons.gained(pair, this.page(args));
  }

  @ResolveField(() => GeneSummaryPage, {
    description: 'Genes of the extant species that no PANTHER family models.',
    complexity: pagedComplexity,
  })
  unmodelled(
    @Parent() pair: ComparisonPair,
    @Args() args: PagingArgs,
  ): Promise<Page<GeneSummary>> {
    return this.comparisons.unmodelled(pair, this.page(args));
  }

  private page(args: PagingArgs) {
    return graphqlPageRequest(args, this.config.get('GRAPHQL_MAX_PAGE_SIZE'));
  }
}
