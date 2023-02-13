import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('/todos/')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @UseGuards(AccessTokenGuard)
  @Get('/list')
  getTodos() {
    return this.todoService.getTodos();
  }

  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @UseGuards(AccessTokenGuard)
  @Post()
  createTodo(@Body() dto: CreateTodoDto, @UploadedFiles() files?) {
    const { image } = files;
    return this.todoService.createTodo(dto, image[0]);
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
