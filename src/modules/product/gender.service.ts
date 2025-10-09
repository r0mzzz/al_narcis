import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateGenderDto, UpdateGenderDto } from './dto/gender.dto';
import { v4 as uuidv4 } from 'uuid';

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
    if (this.genders.find(g => g.code === dto.code)) {
      throw new ConflictException('Gender with this code already exists');
    }
    const entry: GenderEntry = { id: uuidv4(), ...dto };
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
