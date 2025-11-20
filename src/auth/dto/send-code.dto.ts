import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  username: string;
}
