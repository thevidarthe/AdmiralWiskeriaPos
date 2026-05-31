import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class LoginPasswordDto {
  @IsString()
  tenantSlug!: string;

  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;
}

export class LoginPinDto {
  @IsString()
  tenantSlug!: string;

  @IsString()
  userId!: string;

  @Matches(/^\d{4}$/, { message: 'El PIN debe ser exactamente 4 dígitos' })
  pin!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword!: string;
}

export class ChangePinDto {
  @IsString()
  currentPassword!: string;

  @Matches(/^\d{4}$/, { message: 'El nuevo PIN debe ser 4 dígitos' })
  newPin!: string;
}
