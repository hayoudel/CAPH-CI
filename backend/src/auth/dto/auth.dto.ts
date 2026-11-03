import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from '../../common/utils/password';

const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @ApiProperty({ example: 'awa.kone@horizon-inclusif.example' })
  @Transform(lower) @IsEmail({}, { message: 'Saisissez une adresse e-mail valide.' }) @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Demo-Passw0rd!2026' })
  @IsString() @MinLength(1, { message: 'Saisissez votre mot de passe.' }) @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ description: 'Prolonge la session à 30 jours (« Se souvenir de moi »)' })
  @IsOptional() @IsBoolean()
  rememberMe?: boolean;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @Transform(lower) @IsEmail({}, { message: 'Saisissez une adresse e-mail valide.' }) @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Jeton reçu par e-mail' })
  @IsString() @MinLength(20) @MaxLength(200)
  token: string;

  @ApiProperty({ description: PASSWORD_MESSAGE })
  @IsString() @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}

export class AcceptInvitationDto extends ResetPasswordDto {}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString() @MinLength(1) @MaxLength(128)
  currentPassword: string;

  @ApiProperty({ description: PASSWORD_MESSAGE })
  @IsString() @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
