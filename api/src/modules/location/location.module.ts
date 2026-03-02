import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { LocationResolver } from './location.resolver';

@Module({
  providers: [LocationService, LocationResolver],
  controllers: [LocationController],
  exports: [LocationService],
})
export class LocationModule {}
