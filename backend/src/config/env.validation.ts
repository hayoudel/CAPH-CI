import { plainToInstance } from 'class-transformer';
import {
  IsEnum, IsInt, IsOptional, IsString, MinLength, validateSync, Max, Min,
} from 'class-validator';

enum NodeEnv { development = 'development', test = 'test', production = 'production' }

/**
 * Variables d'environnement obligatoires. Si l'une manque ou est invalide,
 * l'application refuse de démarrer (mieux qu'un comportement silencieux).
 */
class EnvironmentVariables {
  @IsEnum(NodeEnv) NODE_ENV: NodeEnv = NodeEnv.development;
  @IsInt() @Min(1) @Max(65535) PORT: number = 3000;
  @IsString() @MinLength(10) DATABASE_URL: string;
  @IsString() APP_URL: string;
  @IsString() CORS_ORIGINS: string;
  @IsString() @MinLength(32, { message: 'JWT_ACCESS_SECRET doit contenir au moins 32 caractères' })
  JWT_ACCESS_SECRET: string;
  @IsString() @MinLength(32, { message: 'JWT_REFRESH_SECRET doit contenir au moins 32 caractères' })
  JWT_REFRESH_SECRET: string;
  @IsString() JWT_ACCESS_TTL: string = '15m';
  @IsString() STORAGE_DIR: string = './storage';
  @IsOptional() @IsString() FILES_ENCRYPTION_KEY?: string;
  @IsOptional() @IsString() MAIL_HOST?: string;
  @IsOptional() @IsInt() MAIL_PORT?: number;
  @IsOptional() @IsString() MAIL_FROM?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => `  - ${e.property} : ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Configuration invalide (fichier .env) :\n${details}`);
  }
  if (validated.NODE_ENV === NodeEnv.production) {
    if (!validated.FILES_ENCRYPTION_KEY) {
      throw new Error('FILES_ENCRYPTION_KEY est obligatoire en production');
    }
    if (/remplacer-par/i.test(validated.JWT_ACCESS_SECRET + validated.JWT_REFRESH_SECRET)) {
      throw new Error('Les secrets JWT par défaut ne doivent pas être utilisés en production');
    }
  }
  return validated;
}
