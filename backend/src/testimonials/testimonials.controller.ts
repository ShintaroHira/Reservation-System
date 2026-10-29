import { Controller, Get } from '@nestjs/common';
import { TestimonialDto, toTestimonialDto } from './testimonial.dto';
import { TestimonialsService } from './testimonials.service';

@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get()
  async list(): Promise<TestimonialDto[]> {
    const testimonials = await this.testimonialsService.findPublished();
    return testimonials.map(toTestimonialDto);
  }
}
