import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLocaleLowerCase())
  email?: string;

  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsNotEmpty()
  password: string;
}
