import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

@Injectable()
export class FileService {
  createFile(file): string {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const fileName = randomUUID() + '.' + fileExtension;
      const filePath = path.resolve(__dirname, '../..', 'images');
      console.log('filepath', filePath);
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }
      fs.writeFileSync(path.resolve(filePath, fileName), file.buffer);
      return 'http://localhost:5100/images/' + fileName;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  deleteFile(file) {}
}
