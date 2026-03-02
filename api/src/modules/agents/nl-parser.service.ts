import { Injectable } from '@nestjs/common';
import { SERVICE_CATEGORIES } from '../../common/constants/service-categories';

export interface ParsedQuery {
  location?: string;
  services: string[];
  onlineOnly: boolean;
}

@Injectable()
export class NlParserService {
  /**
   * Rule-based natural language parser.
   * Extracts location, services, and onlineOnly flag from a free-text query.
   */
  parse(query: string): ParsedQuery {
    const lower = (query || '').toLowerCase();

    // 1. Detect online/virtual/remote modifiers
    const onlineOnly =
      lower.includes('online') ||
      lower.includes('virtual') ||
      lower.includes('remote');

    // 2. Extract services: match each SERVICE_CATEGORY against words in query (case-insensitive)
    //    Handle multi-word categories first (longest match wins)
    const sorted = [...SERVICE_CATEGORIES].sort((a, b) => b.length - a.length);
    const services: string[] = [];
    for (const category of sorted) {
      if (lower.includes(category.toLowerCase())) {
        services.push(category);
      }
    }

    // 3. Extract location: text after "in ", "near ", "around ", "at " — up to end or next keyword
    let location: string | undefined;
    const locationPatterns = [
      /\bin\s+([a-z0-9\s,.-]+?)(?:\s+(?:for|with|offering|that|and|or|online|virtual|remote)|$)/i,
      /\bnear\s+([a-z0-9\s,.-]+?)(?:\s+(?:for|with|offering|that|and|or|online|virtual|remote)|$)/i,
      /\baround\s+([a-z0-9\s,.-]+?)(?:\s+(?:for|with|offering|that|and|or|online|virtual|remote)|$)/i,
      /\bat\s+([a-z0-9\s,.-]+?)(?:\s+(?:for|with|offering|that|and|or|online|virtual|remote)|$)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        location = match[1].trim();
        break;
      }
    }

    return {
      location: location || undefined,
      services,
      onlineOnly,
    };
  }
}
