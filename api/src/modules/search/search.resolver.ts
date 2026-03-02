import { Resolver, Query, Args } from '@nestjs/graphql';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResult } from './dto/provider.type';

@Resolver()
export class SearchResolver {
  constructor(private readonly searchService: SearchService) {}

  @Query(() => SearchResult, { name: 'search' })
  async search(
    @Args('input', { type: () => SearchQueryDto }) input: SearchQueryDto,
  ): Promise<SearchResult> {
    return this.searchService.search(input);
  }
}
