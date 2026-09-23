import { ApolloDriverConfig } from '@nestjs/apollo';
import { Request, Response } from 'express';
import { depthLimitRule } from '../common/graphql/depth-limit.rule';
import { ConfigService } from '../config/config.service';

/**
 * Apollo settings, all explicit. `@nestjs/apollo` otherwise switches on the
 * deprecated Playground and Apollo switches on stack traces in error
 * responses whenever `NODE_ENV` is not "production" — c-api relied on those
 * defaults. The schema is built in memory; `src/schema.gql` is written by
 * `npm run schema:generate`, never at runtime.
 */
export function graphqlOptions(config: ConfigService): ApolloDriverConfig {
  const dev = config.isEnv('dev');
  return {
    path: '/graphql',
    autoSchemaFile: true,
    sortSchema: true,
    graphiql: dev,
    playground: false,
    introspection: true,
    includeStacktraceInErrorResponses: dev,
    context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
    validationRules: [depthLimitRule(config.get('GRAPHQL_MAX_DEPTH'))],
  };
}
