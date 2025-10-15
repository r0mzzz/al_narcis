import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateGenderDto, UpdateGenderDto } from './dto/gender.dto';
import { v4 as uuidv4 } from 'uuid';
import { plainToInstance } from 'class-transformer';

export interface GenderEntry {
  id: string;
  type: string;
  code: string;
  name?: string; // optional, only for response
}

const GenderNameMap: Record<string, string> = {
  M: 'Kişi',
  W: 'Qadın',
  U: 'Unisex',
};
function addNameField(entry: GenderEntry): GenderEntry {
  return { ...entry, name: GenderNameMap[entry.code] || '' };
}

@Injectable()
export class GenderService {
  private genders: GenderEntry[] = [
    { id: '1', type: 'MAN', code: 'M' },
    { id: '2', type: 'WOMAN', code: 'W' },
    { id: '3', type: 'UNISEX', code: 'U' },
  ];

  findAll(): GenderEntry[] {
    return this.genders.map(addNameField);
  }

  create(dto: CreateGenderDto): GenderEntry {
    if (this.genders.find((g) => g.code === dto.code)) {
      throw new ConflictException('Gender with this code already exists');
    }
    const entry: GenderEntry = { id: uuidv4(), type: dto.type, code: dto.code };
    this.genders.push(entry);
    return addNameField(entry);
  }

  update(id: string, dto: UpdateGenderDto): GenderEntry {
    const idx = this.genders.findIndex((g) => g.id === id);
    if (idx === -1) throw new NotFoundException('Gender not found');
    this.genders[idx] = { ...this.genders[idx], ...dto };
    return addNameField(this.genders[idx]);
  }

  delete(id: string): void {
    const idx = this.genders.findIndex((g) => g.id === id);
    if (idx === -1) throw new NotFoundException('Gender not found');
    this.genders.splice(idx, 1);
  }
}
