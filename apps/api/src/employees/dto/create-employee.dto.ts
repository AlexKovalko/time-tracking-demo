import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

function emptyToNull(value: unknown): unknown {
  if (value === '' || value === undefined) return null;
  return value;
}

export class CreateEmployeeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @Transform(({ value }: { value: unknown }) => emptyToNull(value))
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  departmentId?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : emptyToNull(value),
  )
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : emptyToNull(value),
  )
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsEmail()
  @MaxLength(320)
  email?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : emptyToNull(value),
  )
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(64)
  phone?: string | null;
}
