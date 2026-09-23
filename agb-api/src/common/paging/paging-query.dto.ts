import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PageRequest } from './page';

/** Upper bound for REST pages; the largest species list is 102,802 genes. */
export const REST_MAX_LIMIT = 1_000_000;

/** `?offset=&limit=` for REST collections. Omit `limit` to get every row. */
export class PagingQueryDto {
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: REST_MAX_LIMIT,
    description: 'Omit to get every row.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(REST_MAX_LIMIT)
  limit?: number;
}

export function pageRequest(query: PagingQueryDto): PageRequest {
  return { offset: query.offset ?? 0, limit: query.limit ?? null };
}
