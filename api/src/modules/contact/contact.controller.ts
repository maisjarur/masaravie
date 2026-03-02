import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

@Controller('api/contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * POST /api/contact
   * Throttled: 5 submissions per hour
   */
  @Throttle({ default: { ttl: 60 * 60 * 1000, limit: 5 } })
  @Post()
  async submit(@Body() body: ContactDto) {
    try {
      this.contactService.save(body.name, body.email, body.message);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err.message || 'Could not save your message. Please try again.',
      };
    }
  }
}
