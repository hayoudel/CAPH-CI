import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  // Derrière un relais (nginx, hébergeur), l'adresse du visiteur vient de l'en-tête X-Forwarded-For.
  const hops = Number(config.get('TRUST_PROXY') ?? 0);
  if (hops > 0) app.getHttpAdapter().getInstance().set('trust proxy', hops);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: String(config.get('CORS_ORIGINS')).split(',').map((o) => o.trim()),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  // Validation stricte : champs inconnus refusés, 422 en cas d'erreur de validation.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, errorHttpStatusCode: 422 }),
  );
}
