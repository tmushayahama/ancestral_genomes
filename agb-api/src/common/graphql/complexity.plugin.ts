import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';
import { ConfigService } from '../../config/config.service';

/**
 * Rejects operations whose estimated cost exceeds `GRAPHQL_MAX_COMPLEXITY`,
 * before any resolver runs. List fields declare their cost as "selection ×
 * rows" (see `pagedComplexity`), so asking for 10,000 genes with ten fields
 * each costs about 100,000.
 */
@Plugin()
export class ComplexityPlugin implements ApolloServerPlugin {
  constructor(
    private readonly schemaHost: GraphQLSchemaHost,
    private readonly config: ConfigService,
  ) {}

  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    const max = this.config.get('GRAPHQL_MAX_COMPLEXITY');
    const { schema } = this.schemaHost;

    return {
      async didResolveOperation({ request, document }) {
        const complexity = getComplexity({
          schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [
            fieldExtensionsEstimator(),
            simpleEstimator({ defaultComplexity: 1 }),
          ],
        });
        if (complexity > max) {
          throw new GraphQLError(
            `Query complexity ${complexity} exceeds the maximum of ${max}.`,
            {
              extensions: {
                code: 'QUERY_TOO_COMPLEX',
                complexity,
                max,
                http: { status: 400 },
              },
            },
          );
        }
      },
    };
  }
}
