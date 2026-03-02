import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import configuration from './config/configuration';
import { CacheModule } from './modules/cache/cache.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { SearchModule } from './modules/search/search.module';
import { LocationModule } from './modules/location/location.module';
import { ContactModule } from './modules/contact/contact.module';
import { AgentsModule } from './modules/agents/agents.module';

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Global rate limiting: 100 requests per 15 minutes
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 15 * 60 * 1000,
        limit: 100,
      },
    ]),

    // GraphQL with Apollo
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
    }),

    // Application modules
    CacheModule,
    ScraperModule,
    SearchModule,
    LocationModule,
    ContactModule,
    AgentsModule,

    // Serve React build in production
    ...(process.env.NODE_ENV === 'production'
      ? [
          ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', '..', '..', 'web', 'dist'),
            exclude: ['/api/(.*)', '/graphql'],
          }),
        ]
      : []),
  ],
})
export class AppModule {}
