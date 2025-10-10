import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GPService } from './gp.service';
import { GPController } from './gp.controller';

@Module({
  imports: [HttpModule],
  controllers: [GPController],
  providers: [GPService],
  exports: [GPService],
})
export class GPModule {}
