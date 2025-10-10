import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GPService } from './gp.service';
import { GPController } from './gp.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [GPController],
  providers: [GPService],
  exports: [GPService],
})
export class GPModule {}
