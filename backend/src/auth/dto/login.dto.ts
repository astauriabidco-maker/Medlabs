
import { IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(7, { message: 'Password must be at least 7 characters' })
    @MaxLength(128, { message: 'Password must not exceed 128 characters' })
    password: string;
}
