import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsISO8601 } from 'class-validator';

export type TodoDocument = Todo & Document;

@Schema({ versionKey: false })
export class Todo {
  @Prop()
  todo_id: string;

  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop({ type: Date })
  start_date;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);
