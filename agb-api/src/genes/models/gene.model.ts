import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from '../../common/paging/paginated';

@ObjectType({ description: 'A gene in a list.' })
export class GeneSummary {
  @ApiProperty({ example: 'PTN000000526' })
  @Field(() => ID)
  ptn: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'null when unnamed.',
  })
  @Field(() => String, { nullable: true })
  name: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'PTHR10010',
    description: 'PANTHER family; null when no family models the gene.',
  })
  @Field(() => String, { nullable: true })
  familyId: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
    description: "Extant genes only: the gene's own PANTHER long id.",
  })
  @Field(() => String, { nullable: true })
  pantherId: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'HUMAN|HGNC=11019|UniProtKB=Q06495',
    description:
      'Ancestral genes only: the extant gene standing in for it — its default proxy, or its descendant in the requested proxy species (null when it has none there).',
  })
  @Field(() => String, { nullable: true })
  proxyGene: string | null;
}

@ObjectType()
export class GeneSummaryPage extends Paginated(GeneSummary) {}

@ObjectType({
  description: 'An extant gene that stands in for an ancestral one.',
})
export class ProxyGene {
  @ApiProperty({ example: 'HUMAN' })
  @Field()
  speciesShortName: string;

  @ApiProperty({ type: String, nullable: true, example: 'Homo sapiens' })
  @Field(() => String, { nullable: true })
  speciesLongName: string | null;

  @ApiProperty({ example: 'HUMAN|HGNC=11019|UniProtKB=Q06495' })
  @Field()
  gene: string;
}

@ObjectType()
export class Gene {
  @ApiProperty({ example: 'PTN000000526' })
  @Field(() => ID)
  ptn: string;

  @ApiProperty({ type: String, nullable: true })
  @Field(() => String, { nullable: true })
  name: string | null;

  @ApiProperty({ example: 'LUCA' })
  @Field()
  speciesShortName: string;

  @ApiProperty({ type: String, nullable: true, example: 'LUCA' })
  @Field(() => String, { nullable: true })
  speciesLongName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'SPECIATION',
    description: 'The event at this node of the gene tree.',
  })
  @Field(() => String, { nullable: true })
  event: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'PTHR10010' })
  @Field(() => String, { nullable: true })
  familyId: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Field(() => String, { nullable: true })
  familyName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The protein: alignment padding removed, uppercase.',
  })
  @Field(() => String, { nullable: true })
  sequence: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The sequence as stored, with alignment padding.',
  })
  @Field(() => String, { nullable: true })
  alignedSequence: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'PANTHER long id; null for ancestral genes, which have none.',
  })
  @Field(() => String, { nullable: true })
  pantherId: string | null;

  @ApiProperty()
  @Field()
  isAncestral: boolean;

  @ApiProperty({ type: () => [ProxyGene] })
  @Field(() => [ProxyGene])
  proxyGenes: ProxyGene[];
}

export enum AnnotationInheritance {
  DIRECT = 'direct',
  INHERITED = 'inherited',
}

registerEnumType(AnnotationInheritance, {
  name: 'AnnotationInheritance',
  description:
    'Whether PAINT annotated this node directly or it inherits the term.',
});

@ObjectType({ description: 'A GO term painted onto a gene (PAINT).' })
export class PaintAnnotation {
  @ApiProperty({ example: 'GO:0016301' })
  @Field()
  goId: string;

  @ApiProperty({ example: 'kinase activity' })
  @Field()
  goName: string;

  @ApiProperty({
    enum: AnnotationInheritance,
    nullable: true,
    description: 'null when the source does not say.',
  })
  @Field(() => AnnotationInheritance, { nullable: true })
  inheritance: AnnotationInheritance | null;
}
