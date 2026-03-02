import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { NlParserService } from './nl-parser.service';
import { AgentsController } from './agents.controller';
import { AgentsResolver } from './agents.resolver';

@Module({
  imports: [SearchModule],
  providers: [NlParserService, AgentsResolver],
  controllers: [AgentsController],
})
export class AgentsModule {}
