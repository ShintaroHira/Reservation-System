import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial } from './testimonial.entity';

@Injectable()
export class TestimonialsService {
  constructor(@InjectRepository(Testimonial) private readonly testimonials: Repository<Testimonial>) {}

  findPublished(): Promise<Testimonial[]> {
    return this.testimonials.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }
}
