import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from '../../common/paging/paginated';
import { Species } from '../../species/models/species.model';

@ObjectType({ description: 'An extant gene descended from an ancestral one.' })
export class DescendantGene {
  @ApiProperty({ example: 'PTN002467165' })
  @Field(() => ID)
  ptn: string;

  @ApiProperty({ type: String, nullable: true })
  @Field(() => String, { nullable: true })
  name: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
  })
  @Field(() => String, { nullable: true })
  pantherId: string | null;
}

@ObjectType({
  description: 'An ancestral gene that survives in the extant genome.',
})
export class InheritedGene {
  @ApiProperty({ example: 'PTN000000538' })
  @Field(() => ID)
  ptn: string;

  @ApiProperty({ type: String, nullable: true })
  @Field(() => String, { nullable: true })
  name: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'PTHR10010' })
  @Field(() => String, { nullable: true })
  familyId: string | null;

  @ApiProperty({ type: () => [DescendantGene] })
  @Field(() => [DescendantGene])
  descendants: DescendantGene[];
}

@ObjectType()
export class InheritedGenePage extends Paginated(InheritedGene) {}

@ObjectType()
export class ComparisonCounts {
  @ApiProperty({ description: 'Ancestral genes with at least one descendant.' })
  @Field(() => Int)
  inherited: number;

  @ApiProperty({ description: 'Extant genes descended from those.' })
  @Field(() => Int)
  descendants: number;

  @ApiProperty({ description: 'Ancestral genes with no descendant.' })
  @Field(() => Int)
  lost: number;

  @ApiProperty({
    description:
      'Extant genes, modelled by a family, whose lineage does not pass through the ancestral genome.',
  })
  @Field(() => Int)
  gained: number;

  @ApiProperty({ description: 'Extant genes no family models.' })
  @Field(() => Int)
  unmodelled: number;
}

@ObjectType({
  description:
    'An ancestral genome compared with one of its extant descendants.',
})
export class GenomeComparison {
  @ApiProperty({ type: () => Species })
  @Field(() => Species)
  ancestral: Species;

  @ApiProperty({ type: () => Species })
  @Field(() => Species)
  extant: Species;

  @ApiProperty({ type: () => ComparisonCounts })
  @Field(() => ComparisonCounts)
  counts: ComparisonCounts;
}

/** The validated pair every comparison query starts from. */
export interface ComparisonPair {
  ancestral: Species;
  extant: Species;
}
