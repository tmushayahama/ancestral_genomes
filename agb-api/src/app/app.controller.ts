import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class AppController {
  @Get()
  index() {
    return {
      name: 'Ancestral Genomes API',
      docs: '/api/docs',
      openapi: '/api/docs-json',
      graphql: '/graphql',
      health: '/api/health',
    };
  }
}
