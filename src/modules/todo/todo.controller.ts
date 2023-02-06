import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { AccessTokenGuard } from '../../guards/jwt-guard';

@Controller('/api/todos/')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @UseGuards(AccessTokenGuard)
  @Get('/list')
  getTodos() {
    return this.todoService.getTodos();
  }

  @UseGuards(AccessTokenGuard)
  @Post()
  createTodo(@Body() dto: CreateTodoDto) {
    return this.todoService.createTodo(dto);
  }

  @UseGuards(AccessTokenGuard)
  @Put('/:id')
  updateTodo(@Body() dto: CreateTodoDto, @Param('id') id: string) {
    return this.todoService.updateTodo(id, dto);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('/:id')
  deleteTodo(@Param('id') id: string) {
    return this.todoService.deleteTodo(id);
  }
}
