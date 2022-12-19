import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Todo, TodoDocument } from '../schema/todo.schema';

@Injectable()
export class RecipeService {
  constructor(
    @InjectModel(Todo.name) private receiptModel: Model<TodoDocument>,
  ) {}
}
