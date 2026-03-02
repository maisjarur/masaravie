import { Module } from '@nestjs/common';
import { ScraperModule } from '../scraper/scraper.module';
import { CacheModule } from '../cache/cache.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchResolver } from './search.resolver';

@Module({
  imports: [ScraperModule, CacheModule],
  providers: [SearchService, SearchResolver],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
