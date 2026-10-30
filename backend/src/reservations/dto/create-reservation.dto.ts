import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
  ValidateIf,
  ValidationOptions,
} from 'class-validator';
import { isCalendarDate } from '../../common/calendar-date';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

function IsCalendarDate(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy({ name: 'isCalendarDate', validator: { validate: isCalendarDate } }, options);
}

/** Rejects the field when `other` is also set on the same object. */
function IsExclusiveWith(other: string, options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isExclusiveWith',
      validator: { validate: (_value, args) => (args?.object as Record<string, unknown>)[other] == null },
    },
    options,
  );
}

/**
 * A booking names either a room type (the system picks a free room of that type,
 * as the landing-page form does) or one specific room, never both.
 */
export class CreateReservationDto {
  @ValidateIf((dto: CreateReservationDto) => dto.roomId == null)
  @IsUUID('4', { message: 'Please choose a room.' })
  roomTypeId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Please choose a room.' })
  @IsExclusiveWith('roomTypeId', { message: 'Choose either a room type or a specific room, not both.' })
  roomId?: string;

  @IsCalendarDate({ message: 'Please choose a valid check-in date.' })
  checkIn!: string;

  @IsCalendarDate({ message: 'Please choose a valid check-out date.' })
  checkOut!: string;

  @Type(() => Number)
  @IsInt({ message: 'Number of guests must be a whole number.' })
  @Min(1, { message: 'At least one guest is required.' })
  @Max(20, { message: 'Please contact us directly for groups larger than 20.' })
  guests!: number;

  @Transform(trim)
  @IsString({ message: 'Please enter your full name.' })
  @Length(2, 120, { message: 'Please enter your full name (2–120 characters).' })
  fullName!: string;

  @Transform(trim)
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MaxLength(254, { message: 'Please enter a valid email address.' })
  email!: string;

  @IsOptional()
  @Transform(trimToUndefined)
  @Matches(/^\+?[0-9()\-.\s]{6,40}$/, { message: 'Please enter a valid phone number.' })
  phone?: string;

  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(1000, { message: 'Special requests must be 1,000 characters or fewer.' })
  specialRequests?: string;

  /** Expected arrival time at the hotel, 24-hour `HH:MM`. */
  @IsOptional()
  @Transform(trimToUndefined)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Please enter a valid arrival time (HH:MM).' })
  arrivalTime?: string;
}
