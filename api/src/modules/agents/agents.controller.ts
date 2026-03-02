import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AgentApiKeyGuard } from '../../common/guards/agent-api-key.guard';
import { NlParserService } from './nl-parser.service';
import { SearchService } from '../search/search.service';

const PROVIDER_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Provider',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    rating: { type: ['number', 'null'] },
    reviewCount: { type: ['integer', 'null'] },
    services: { type: 'array', items: { type: 'string' } },
    location: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'string' },
        lat: { type: ['number', 'null'] },
        lng: { type: ['number', 'null'] },
      },
    },
    online: { type: 'boolean' },
    curationScore: { type: 'number' },
  },
};

@Controller('api/agents')
export class AgentsController {
  constructor(
    private readonly nlParserService: NlParserService,
    private readonly searchService: SearchService,
  ) {}

  /**
   * POST /api/agents/query
   * Parses a natural language query and returns search results.
   * Requires x-agent-key header.
   */
  @UseGuards(AgentApiKeyGuard)
  @Post('query')
  async query(@Body() body: { query: string }) {
    if (!body?.query) {
      throw new HttpException('query field is required', HttpStatus.BAD_REQUEST);
    }

    const parsedQuery = this.nlParserService.parse(body.query);

    const result = await this.searchService.search({
      location: parsedQuery.location,
      services: parsedQuery.services,
      onlineOnly: parsedQuery.onlineOnly,
      page: 1,
      pageSize: 20,
    });

    return {
      ...result,
      parsedQuery,
    };
  }

  /**
   * GET /api/agents/schema
   * Returns the JSON Schema for the Provider type.
   * Requires x-agent-key header.
   */
  @UseGuards(AgentApiKeyGuard)
  @Get('schema')
  getSchema() {
    return PROVIDER_JSON_SCHEMA;
  }
}
