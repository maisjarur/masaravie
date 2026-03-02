import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AgentApiKeyGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const keys: string[] = this.config.get('agentApiKeys') || [];
    if (!keys.length) throw new UnauthorizedException('No agent keys configured');

    let apiKey: string | undefined;
    // Support both HTTP and GraphQL contexts
    try {
      const gqlCtx = GqlExecutionContext.create(context);
      const req = gqlCtx.getContext().req;
      apiKey = req?.headers?.['x-agent-key'];
    } catch {
      const req = context.switchToHttp().getRequest();
      apiKey = req?.headers?.['x-agent-key'];
    }

    if (!apiKey || !keys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid agent API key');
    }
    return true;
  }
}
