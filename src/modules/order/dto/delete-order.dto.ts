import { IsString } from 'class-validator';

export class DeleteOrderDto {
  @IsString()
  readonly id: string;
}
