import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AgentApiKeyGuard } from '../../common/guards/agent-api-key.guard';
import { NlParserService } from './nl-parser.service';
import { SearchService } from '../search/search.service';
import { SearchResult } from '../search/dto/provider.type';

@Resolver()
export class AgentsResolver {
  constructor(
    private readonly nlParserService: NlParserService,
    private readonly searchService: SearchService,
  ) {}

  @UseGuards(AgentApiKeyGuard)
  @Query(() => SearchResult, { name: 'naturalLanguageSearch' })
  async naturalLanguageSearch(
    @Args('query', { type: () => String }) query: string,
  ): Promise<SearchResult> {
    const parsed = this.nlParserService.parse(query);
    return this.searchService.search({
      location: parsed.location,
      services: parsed.services,
      onlineOnly: parsed.onlineOnly,
      page: 1,
      pageSize: 20,
    });
  }
}
