import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { listComplexity } from '../common/paging/paging.args';
import { Ancestor, Species, Stats } from './models/species.model';
import { SpeciesIndex } from './species-index.service';

@Resolver(() => Species)
export class SpeciesResolver {
  constructor(private readonly speciesIndex: SpeciesIndex) {}

  @Query(() => [Species], {
    description: 'Every species, flat. Nest client-side by treeParentId.',
    complexity: listComplexity(300),
  })
  speciesList(): Promise<Species[]> {
    return this.speciesIndex.all();
  }

  @Query(() => Species, {
    nullable: true,
    description: 'By short or long name; null when there is no such species.',
  })
  async species(@Args('name') name: string): Promise<Species | null> {
    return (await this.speciesIndex.find(name)) ?? null;
  }

  @ResolveField(() => Species, {
    nullable: true,
    description:
      'Parent in the repaired tree (see treeParentId); null for the root.',
  })
  async parent(@Parent() species: Species): Promise<Species | null> {
    return species.treeParentId === null
      ? null
      : ((await this.speciesIndex.byId(species.treeParentId)) ?? null);
  }

  @ResolveField(() => [Species], { complexity: listComplexity(10) })
  children(@Parent() species: Species): Promise<Species[]> {
    return this.speciesIndex.children(species.id);
  }
}

@Resolver(() => Ancestor)
export class AncestorResolver {
  constructor(private readonly speciesIndex: SpeciesIndex) {}

  @ResolveField(() => Species, {
    nullable: true,
    description:
      'null when the ancestor has no row in the data (e.g. eurosids).',
  })
  async species(@Parent() ancestor: Ancestor): Promise<Species | null> {
    return (await this.speciesIndex.byShortName(ancestor.shortName)) ?? null;
  }
}

@Resolver(() => Stats)
export class StatsResolver {
  constructor(private readonly speciesIndex: SpeciesIndex) {}

  @Query(() => Stats)
  stats(): Promise<Stats> {
    return this.speciesIndex.stats();
  }
}
