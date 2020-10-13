import path from 'path';
import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import jwt from 'express-jwt';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import { ApolloServer } from 'apollo-server-express';
import { buildSchemaSync } from 'type-graphql';
import { ConnectionOptions, createConnection, getConnection, useContainer } from 'typeorm';
import { Container } from 'typedi';
import config from '@app/config';
import logger from '@app/logger';
import { IContext } from '@app/types';
import { AuthorizationMiddleware } from '@app/middlewares';
import { CacheService } from '@app/services';
import { JWTHelper } from '@app/helper';
import { UnauthorizedError } from '@app/error';
import { EnvUtil } from '@app/util';

export default class Server {
  private static instance: Server;

  private readonly app: express.Application;

  private server?: http.Server;

  private constructor() {
    this.app = express();
    this.server = undefined;

    this.configure();
    logger.info('Server is ready');
  }

  private configure(): void {
    logger.debug('Server configuration started');

    this.configureChecks();
    this.configureServices();
    this.configureServer();

    logger.debug('Server configuration finished');
  }

  // eslint-disable-next-line class-methods-use-this
  private configureChecks(): void {
    try {
      getConnection();
      logger.error(
        'Server must be instantiated before database connection to allow dependency injection',
      );
      process.exit(1);
    } catch (error) {
      if (error.name !== 'ConnectionNotFoundError') throw error;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private configureServices(): void {
    CacheService.mount(config.REDIS.URL);
  }

  private configureServer(): void {
    // Dependency injection
    useContainer(Container);
    logger.debug('Dependency injection configured');

    // Express server
    this.app
      .enable('trust proxy')
      .use(compression())
      .use(cors())
      .use(helmet({ contentSecurityPolicy: EnvUtil.isProduction() ? undefined : false }))
      .use(
        config.GRAPHQL.PATH,
        jwt({
          secret: config.JWT.SECRET,
          algorithms: [config.JWT.ALGORITHM],
          credentialsRequired: false,
          // TODO Problem in response when the token is revoked
          isRevoked: async (req, _, done) => {
            const token: string | undefined = JWTHelper.getToken(req);

            if (!token || (await JWTHelper.isBlocked(token))) {
              return done(new UnauthorizedError('The JWT token has been revoked'), true);
            }

            return done(undefined, false);
          },
        }),
      );
    logger.debug('Express server configured');

    // Apollo server
    const server = new ApolloServer({
      schema: buildSchemaSync({
        resolvers: [path.join(__dirname, '..', config.GRAPHQL.RESOLVERS)],
        authChecker: AuthorizationMiddleware,
        container: Container,
      }),
      playground: config.GRAPHQL.PLAYGROUND,
      tracing: !EnvUtil.isProduction(),
      context: ({ req, res }) => {
        const context: IContext = {
          req,
          res,
          user: req.user,
        };

        return context;
      },
    });
    logger.debug('Apollo server configured');

    server.applyMiddleware({ app: this.app, path: config.GRAPHQL.PATH });
    logger.debug(`Express middleware applied to Apollo Server on path ${config.GRAPHQL.PATH}`);
  }

  public static getInstance(): Server {
    if (!Server.instance) {
      Server.instance = new Server();
      logger.debug('Server instantiated');
    }

    return Server.instance;
  }

  public async start(port: number = config.NODE.PORT): Promise<AddressInfo> {
    if (this.server) {
      logger.warn('Server is already started');
      return this.server.address() as AddressInfo;
    }

    await createConnection(<ConnectionOptions>{
      type: config.DATABASE.TYPE,
      url: config.DATABASE.URL,
      extra: {
        ssl: config.DATABASE.SSL,
      },
      synchronize: config.DATABASE.SYNCHRONIZE,
      logging: config.DATABASE.LOGGING,
      entities: [path.join(__dirname, config.DATABASE.ENTITIES)],
      migrations: [path.join(__dirname, config.DATABASE.MIGRATIONS)],
      subscribers: [path.join(__dirname, config.DATABASE.SUBSCRIBERS)],
      cache: {
        type: 'ioredis',
        alwaysEnabled: true,
        port: config.REDIS.URL,
      },
    });
    logger.info('Database connected');

    return new Promise((resolve, reject) => {
      this.server = this.app
        .listen(port, () => {
          const addressInfo: AddressInfo = this.server!.address() as AddressInfo;
          logger.info(
            `Server started and listening at ${addressInfo.address} on port ${addressInfo.port}`,
          );
          resolve(addressInfo);
        })
        .on('error', (error) => {
          logger.error(`Server not started due to ${error}`);
          reject(error);
        });
    });
  }

  public async stop(): Promise<void> {
    if (!this.server) {
      logger.warn('Server is not started');
      return undefined;
    }

    // Unmount services
    await CacheService.unmount();

    // Disconnect databse
    await getConnection().close();
    logger.info('Database disconnected');

    // Shutdown server
    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          logger.error(`Server not stopped due to ${error}`);
          reject(error);
        }

        this.server = undefined;
        logger.info('Server stopped');
        resolve();
      });
    });
  }
}
