import { IsNotEmpty, MinLength } from 'class-validator';

export class CreateTodoDto {
  @IsNotEmpty()
  @MinLength(5)
  readonly name;

  @MinLength(5)
  readonly description;

  readonly todo_id;
}
