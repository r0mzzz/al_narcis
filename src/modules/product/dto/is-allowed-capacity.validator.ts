import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { CapacityService } from '../capacity.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsAllowedCapacityConstraint
  implements ValidatorConstraintInterface
{
  constructor(private readonly capacityService: CapacityService) {}

  async validate(value: any) {
    const allowed = await this.capacityService.getCapacities();
    return allowed.includes(Number(value));
  }

  defaultMessage() {
    return `Capacity ($value) is not allowed.`;
  }
}

export function IsAllowedCapacity(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAllowedCapacityConstraint,
    });
  };
}
