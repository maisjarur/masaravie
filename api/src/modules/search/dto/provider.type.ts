import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class ProviderLocation {
  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  country?: string;

  @Field(() => Float, { nullable: true })
  lat?: number;

  @Field(() => Float, { nullable: true })
  lng?: number;
}

@ObjectType()
export class Provider {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field(() => Int, { nullable: true })
  reviewCount?: number;

  @Field(() => [String])
  services: string[];

  @Field(() => ProviderLocation)
  location: ProviderLocation;

  @Field()
  online: boolean;

  @Field(() => Float, { nullable: true })
  curationScore?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  raw?: any;
}

@ObjectType()
export class SearchMeta {
  @Field({ nullable: true })
  location?: string;

  @Field()
  cached: boolean;

  @Field(() => Int, { nullable: true })
  queryTime?: number;
}

@ObjectType()
export class SearchResult {
  @Field(() => [Provider])
  providers: Provider[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field()
  hasMore: boolean;

  @Field(() => SearchMeta)
  meta: SearchMeta;
}
