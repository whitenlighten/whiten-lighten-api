import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class AuthCredentialsDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}