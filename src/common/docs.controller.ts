import { Controller, Get, Res } from '@nestjs/common';
import { SwaggerDocumentService } from './swagger.provider';
import { Response } from 'express';

@Controller('api')
export class DocsController {
  constructor(private readonly swaggerService: SwaggerDocumentService) {}

  @Get('swagger-json')
  getSwaggerJson(@Res() res: Response) {
    const doc = this.swaggerService.getDocument();
    if (!doc) {
      return res.status(503).json({ message: 'Swagger document not ready' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=swagger.json');
    return res.send(doc);
  }
}
