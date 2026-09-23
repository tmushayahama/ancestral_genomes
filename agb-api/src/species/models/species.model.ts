import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from '../../common/paging/paginated';

@ObjectType({ description: 'An ancestor of a species, nearest first by age.' })
export class Ancestor {
  @ApiProperty({ example: 'Homo-Pan' })
  @Field()
  shortName: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 6.65,
    description: 'Millions of years ago; null when the data has no age.',
  })
  @Field(() => Float, { nullable: true })
  timescale: number | null;
}

@ObjectType({
  description:
    'A node of the species tree: an extant species (a leaf) or a reconstructed ancestral genome.',
})
export class Species {
  @ApiProperty({ example: '117' })
  @Field(() => ID)
  id: string;

  @ApiProperty({ example: 'HUMAN' })
  @Field()
  shortName: string;

  @ApiProperty({ example: 'Homo sapiens' })
  @Field()
  longName: string;

  @ApiProperty({ type: Number, nullable: true, example: 9606 })
  @Field(() => Int, { nullable: true })
  taxonId: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 0,
    description:
      'Speciation time in millions of years ago: 0 for extant species, null when unknown.',
  })
  @Field(() => Float, { nullable: true })
  timescale: number | null;

  @ApiProperty({ example: 20851 })
  @Field(() => Int)
  geneCount: number;

  @ApiProperty({
    description:
      'True for leaves of the tree. Derived from the tree, not from timescale (eudicotyledons is stored with 0).',
  })
  @Field()
  isExtant: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '120',
    description:
      'Parent as stored. null for the root; may name a node that is missing from the data.',
  })
  @Field(() => ID, { nullable: true })
  parentId: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Homo-Pan' })
  @Field(() => String, { nullable: true })
  parentShortName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '120',
    description:
      'Parent to use when drawing the tree: parentId, unless that node is missing from the data, in which case the deepest ancestor that exists.',
  })
  @Field(() => ID, { nullable: true })
  treeParentId: string | null;

  @ApiProperty({
    description: 'True when treeParentId had to be inferred.',
  })
  @Field()
  placementInferred: boolean;

  @ApiProperty({ type: () => [Ancestor] })
  @Field(() => [Ancestor])
  ancestors: Ancestor[];
}

@ObjectType()
export class SpeciesPage extends Paginated(Species) {}

/** `GET /api/species/tree`. REST only: GraphQL cannot return a recursive shape. */
export class SpeciesTreeNode extends Species {
  @ApiProperty({ type: () => [SpeciesTreeNode] })
  children: SpeciesTreeNode[];
}

@ObjectType()
export class SpeciesCounts {
  @ApiProperty({ example: 112 })
  @Field(() => Int)
  ancestral: number;

  @ApiProperty({ example: 143 })
  @Field(() => Int)
  extant: number;

  @ApiProperty({ example: 255 })
  @Field(() => Int)
  total: number;
}

@ObjectType()
export class GeneCounts {
  @ApiProperty({ example: 1424809 })
  @Field(() => Int)
  ancestral: number;

  @ApiProperty({ example: 2625353 })
  @Field(() => Int)
  extant: number;

  @ApiProperty({ example: 4050162 })
  @Field(() => Int)
  total: number;
}

@ObjectType({
  description: 'Release figures, derived from the species tree.',
})
export class Stats {
  @ApiProperty({ type: String, nullable: true, example: '15.0' })
  @Field(() => String, { nullable: true })
  pantherVersion: string | null;

  @ApiProperty({ type: () => SpeciesCounts })
  @Field(() => SpeciesCounts)
  species: SpeciesCounts;

  @ApiProperty({ type: () => GeneCounts })
  @Field(() => GeneCounts)
  genes: GeneCounts;
}
