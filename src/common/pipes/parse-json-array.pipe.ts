import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseJsonArrayPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        throw new Error('Not an array');
      } catch (e) {
        throw new BadRequestException('Invalid array format');
      }
    }
    return value;
  }
}
