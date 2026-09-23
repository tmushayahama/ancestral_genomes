import { ComparisonResolver } from '../comparison/comparison.resolver';
import {
  GeneResolver,
  ProxyGeneResolver,
  SpeciesGenesResolver,
} from '../genes/genes.resolver';
import {
  AncestorResolver,
  SpeciesResolver,
  StatsResolver,
} from '../species/species.resolver';

/** Every resolver, for building the schema without the rest of the app. */
export const RESOLVERS = [
  SpeciesResolver,
  AncestorResolver,
  StatsResolver,
  SpeciesGenesResolver,
  GeneResolver,
  ProxyGeneResolver,
  ComparisonResolver,
];
