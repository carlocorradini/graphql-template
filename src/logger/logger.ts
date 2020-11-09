import { createLogger, format } from 'winston';
import { EnvUtil } from '@app/util';
import { consoleTransport, fileTransport } from './transports';

/**
 * Logger
 */
const logger = createLogger({
  level: EnvUtil.isProduction() ? 'info' : 'debug',
  exitOnError: false,
  format: format.combine(
    format((info) => {
      // eslint-disable-next-line no-param-reassign
      info.level = info.level.toUpperCase();
      return info;
    })(),
    format.colorize(),
    format.align(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:SSS' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level} ${message}`),
  ),
  transports: [
    fileTransport,
    // Remove unnecessary transports in production
    ...(EnvUtil.isProduction() ? [consoleTransport] : []),
  ],
});

logger.debug(`Logger initialized at ${logger.level} level`);

export default logger;
