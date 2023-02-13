import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Todo, TodoDocument } from './schema/todo.schema';
import { CreateTodoDto } from './dto/create-todo.dto';
import * as uuid from 'uuid';
import { FileService } from '../file/file.service';

@Injectable()
export class TodoService {
  constructor(
    @InjectModel(Todo.name) private todoDocumentModel: Model<TodoDocument>,
    private fileService: FileService,
  ) {}

  async getTodos(): Promise<Todo[]> {
    const todos = await this.todoDocumentModel.find({}, { _id: 0 });
    return todos;
  }

  async createTodo(dto: CreateTodoDto, image): Promise<Todo> {
    const imagePath = this.fileService.createFile(image);
    const todo = await this.todoDocumentModel.create({
      ...dto,
      todo_id: uuid.v4(),
      image: imagePath,
    });
    return todo;
  }

  async updateTodo(id: any, dto: CreateTodoDto): Promise<Todo> {
    const updatedTodo = await this.todoDocumentModel.findOneAndUpdate(
      { todo_id: id },
      dto,
      {
        new: true,
      },
    );
    return updatedTodo;
  }

  async deleteTodo(id: any): Promise<any> {
    const isExists: any =
      (await this.todoDocumentModel.find({ todo_id: id }, { _id: 0 }).count()) >
      0;
    if (isExists) {
      const deletedTodo = await this.todoDocumentModel.findOneAndDelete(
        { todo_id: id },
        { _id: 0 },
      );
      return deletedTodo;
    } else {
      return { message: "Todo doesn't exists" };
    }
  }
}
