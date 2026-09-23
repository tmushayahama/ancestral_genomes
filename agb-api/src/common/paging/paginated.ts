import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { Page } from './page';

/**
 * Base class for a concrete page type, e.g.
 * `@ObjectType() class GeneSummaryPage extends Paginated(GeneSummary) {}`.
 * The same class describes the GraphQL type and the Swagger schema, so the two
 * cannot disagree about the shape.
 */
export function Paginated<T>(itemType: Type<T>): Type<Page<T>> {
  @ObjectType({ isAbstract: true })
  abstract class PageType implements Page<T> {
    @ApiProperty({ description: 'Rows matching the request, before paging.' })
    @Field(() => Int)
    total: number;

    @ApiProperty()
    @Field(() => Int)
    offset: number;

    @ApiProperty({
      type: Number,
      nullable: true,
      description: 'null when every row was requested.',
    })
    @Field(() => Int, { nullable: true })
    limit: number | null;

    @ApiProperty({ type: () => [itemType] })
    @Field(() => [itemType])
    items: T[];
  }

  return PageType as unknown as Type<Page<T>>;
}
