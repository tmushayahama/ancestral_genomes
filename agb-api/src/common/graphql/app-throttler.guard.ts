import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * The stock `ThrottlerGuard` reads `req`/`res` from the HTTP context, which a
 * GraphQL resolver does not have. This one also reads them from the GraphQL
 * context (populated in `graphqlOptions`), so one guard covers both APIs.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType<GqlContextType>() === 'graphql') {
      const { req, res } = GqlExecutionContext.create(context).getContext();
      return { req, res };
    }
    return super.getRequestResponse(context);
  }
}
