import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvConfig {
  @IsEnum(NodeEnv) NODE_ENV: NodeEnv = NodeEnv.Development;
  @IsOptional() @IsInt() PORT: number = 4000;
  @IsString() @MinLength(20) DATABASE_URL!: string;
  @IsString() REDIS_HOST: string = 'localhost';
  @IsOptional() @IsInt() REDIS_PORT: number = 6379;
  @IsOptional() @IsString() REDIS_PASSWORD?: string;

  // JWT_SECRET DEBE ser de al menos 32 chars para producción
  @IsString() @MinLength(32, { message: 'JWT_SECRET debe tener al menos 32 caracteres' }) JWT_SECRET!: string;
  @IsOptional() @IsString() JWT_EXPIRES_IN: string = '8h';

  @IsOptional() @IsString() FRONTEND_URL: string = 'http://localhost:3000';
  @IsOptional() @IsString() DEFAULT_TENANT_SLUG: string = 'admiral';
  @IsOptional() @IsString() DEFAULT_TENANT_NAME: string = 'Admiral Whiskería';

  @IsOptional() @IsString() WHATSAPP_ENABLED: string = 'false';
  @IsOptional() @IsString() WHATSAPP_PHONE_NUMBER_ID?: string;
  @IsOptional() @IsString() WHATSAPP_ACCESS_TOKEN?: string;
  @IsOptional() @IsString() WHATSAPP_WEBHOOK_VERIFY_TOKEN?: string;
  @IsOptional() @IsString() WHATSAPP_APP_SECRET?: string;
  @IsOptional() @IsString() WHATSAPP_API_VERSION: string = 'v19.0';

  @IsOptional() @IsString() LOG_LEVEL: string = 'info';
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const finalConfig = plainToInstance(EnvConfig, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(finalConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => `❌ ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`\n⛔ Configuración inválida en .env:\n${messages}\n`);
  }
  // Bloquear secrets inseguros en producción
  if (finalConfig.NODE_ENV === 'production') {
    if (finalConfig.JWT_SECRET.includes('CHANGE') || finalConfig.JWT_SECRET.includes('GENERATE')) {
      throw new Error('⛔ JWT_SECRET en producción no puede usar el valor por defecto');
    }
  }
  return finalConfig;
}
