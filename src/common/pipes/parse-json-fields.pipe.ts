import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseJsonFieldsPipe implements PipeTransform {
  constructor(private readonly fields: string[]) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value !== 'object' || value === null) return value;
    for (const field of this.fields) {
      if (typeof value[field] === 'string') {
        try {
          const parsed = JSON.parse(value[field]);
          value[field] = parsed;
        } catch {
          throw new BadRequestException(`Invalid JSON for field: ${field}`);
        }
      }
    }
    return value;
  }
}

