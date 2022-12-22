import {
  IsDate,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinDate,
  MinLength,
  Validate,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTodoDto {
  @MinLength(5)
  readonly name;

  @MinLength(5)
  readonly description;

  @IsOptional()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  @MinDate(new Date())
  readonly start_date: Date | null = null;

  readonly todo_id;
}
