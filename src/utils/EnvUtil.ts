import env from '@app/config/env';

/**
 * Environment utilities.
 */
export default class EnvUtil {
  /**
   * Production environment identifier
   */
  public static readonly ENV_PRODUCTION: string = 'production';

  /**
   * Development environment identifier
   */
  public static readonly ENV_DEVELOPMENT: string = 'development';

  /**
   * Test environment identifier
   */
  public static readonly ENV_TEST: string = 'test';

  /**
   * Return the current environment.
   *
   * @returns Current environment
   */
  public static getCurrent(): string | undefined {
    return process.env.NODE_ENV || env.NODE_ENV;
  }

  /**
   * Check if the current environment is production
   *
   * @returns True if production, false otherwise
   */
  public static isProduction(): boolean {
    return this.getCurrent() === this.ENV_PRODUCTION;
  }

  /**
   * Check if the current environment is development
   *
   * @returns True if development, false otherwise
   */
  public static isDevelopment(): boolean {
    return this.getCurrent() === this.ENV_DEVELOPMENT;
  }

  /**
   * Check if the current environment is test
   *
   * @returns True if test, false otherwise
   */
  public static isTest(): boolean {
    return this.getCurrent() === this.ENV_TEST;
  }
}