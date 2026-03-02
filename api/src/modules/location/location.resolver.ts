import { Resolver, Query, Args, Float, ObjectType, Field } from '@nestjs/graphql';
import { LocationService } from './location.service';

@ObjectType()
export class LocationSuggestionType {
  @Field()
  label: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  country?: string;

  @Field(() => Float, { nullable: true })
  lat?: number;

  @Field(() => Float, { nullable: true })
  lng?: number;
}

@Resolver()
export class LocationResolver {
  constructor(private readonly locationService: LocationService) {}

  @Query(() => [LocationSuggestionType], { name: 'locationAutocomplete' })
  async locationAutocomplete(
    @Args('query', { type: () => String }) query: string,
  ): Promise<LocationSuggestionType[]> {
    const text = String(query || '').trim().slice(0, 200);
    if (!text) return [];
    return this.locationService.autocomplete(text);
  }
}
