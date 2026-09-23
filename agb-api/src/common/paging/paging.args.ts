import { BadRequestException } from '@nestjs/common';
import { ArgsType, ComplexityEstimatorArgs, Field, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { PageRequest } from './page';

export const GRAPHQL_DEFAULT_LIMIT = 100;

/**
 * `offset`/`limit` for GraphQL list fields. Unlike REST there is no "every
 * row" mode: GraphQL resolves each field of each row, so bulk downloads stay on
 * REST and `limit` is capped by `GRAPHQL_MAX_PAGE_SIZE`.
 *
 * Every arg needs a class-validator decorator: the global ValidationPipe runs
 * with `whitelist: true`, which strips undecorated properties — without them
 * `offset`/`limit` were silently dropped and the defaults applied.
 */
@ArgsType()
export class PagingArgs {
  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  offset: number;

  @Field(() => Int, { defaultValue: GRAPHQL_DEFAULT_LIMIT })
  @IsInt()
  @Min(1)
  limit: number;
}

export function graphqlPageRequest(
  args: { offset?: number | null; limit?: number | null },
  maxLimit: number,
): PageRequest {
  const offset = args.offset ?? 0;
  const limit = args.limit ?? GRAPHQL_DEFAULT_LIMIT;
  if (!Number.isInteger(offset) || offset < 0) {
    throw new BadRequestException('offset must be a non-negative integer.');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw new BadRequestException(
      `limit must be between 1 and ${maxLimit}; use the REST API for bulk lists.`,
    );
  }
  return { offset, limit };
}

/** Complexity of a paged field: its selection, once per requested row. */
export function pagedComplexity({
  args,
  childComplexity,
}: ComplexityEstimatorArgs): number {
  const limit = Number(args.limit ?? GRAPHQL_DEFAULT_LIMIT);
  return 1 + Math.max(1, limit) * childComplexity;
}

/** Complexity of an unpaged list whose size is roughly known. */
export function listComplexity(expectedSize: number) {
  return ({ childComplexity }: ComplexityEstimatorArgs): number =>
    1 + expectedSize * childComplexity;
}
