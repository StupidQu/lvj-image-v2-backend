import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/)
  @Transform(({ value }: { value: string }) => value.trim())
  name: string;

  @IsString()
  @Length(8, 20)
  @Transform(({ value }: { value: string }) => value.trim())
  password: string;

  @IsEmail()
  email: string;
}
