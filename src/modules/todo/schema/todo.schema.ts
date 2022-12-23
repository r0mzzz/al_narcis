import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

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

  @Prop({ type: Boolean })
  completed;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);
