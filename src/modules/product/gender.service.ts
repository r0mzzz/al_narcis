import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateGenderDto, UpdateGenderDto } from './dto/gender.dto';

export interface GenderEntry {
  id: string;
  type: string;
  code: string;
}

@Injectable()
export class GenderService {
  private genders: GenderEntry[] = [
    { id: '1', type: 'MAN', code: 'M' },
    { id: '2', type: 'WOMAN', code: 'W' },
    { id: '3', type: 'UNISEX', code: 'U' },
  ];

  findAll(): GenderEntry[] {
    return this.genders;
  }

  create(dto: CreateGenderDto): GenderEntry {
    if (this.genders.find(g => g.id === dto.id || g.code === dto.code)) {
      throw new ConflictException('Gender with this id or code already exists');
    }
    const entry: GenderEntry = { ...dto };
    this.genders.push(entry);
    return entry;
  }

  update(id: string, dto: UpdateGenderDto): GenderEntry {
    const idx = this.genders.findIndex(g => g.id === id);
    if (idx === -1) throw new NotFoundException('Gender not found');
    this.genders[idx] = { ...this.genders[idx], ...dto };
    return this.genders[idx];
  }

  delete(id: string): void {
    const idx = this.genders.findIndex(g => g.id === id);
    if (idx === -1) throw new NotFoundException('Gender not found');
    this.genders.splice(idx, 1);
  }
}

