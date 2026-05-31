import { WinstonModuleOptions, utilities as nestWinstonUtils } from 'nest-winston';
import * as winston from 'winston';

export function createWinstonOptions(env: 'development' | 'production' | 'test', level = 'info'): WinstonModuleOptions {
  const isDev = env === 'development';

  return {
    level,
    transports: [
      new winston.transports.Console({
        format: isDev
          ? winston.format.combine(
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              winston.format.ms(),
              nestWinstonUtils.format.nestLike('AdmiralPro', {
                colors: true,
                prettyPrint: true,
              }),
            )
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.errors({ stack: true }),
              winston.format.json(),
            ),
      }),
    ],
  };
}
