import { AddressInfo } from 'net';
import Container from 'typedi';
import { Connection, createConnection, ConnectionOptions } from 'typeorm';
import { buildFederatedSchema, buildService } from '@graphmarket/helpers';
import {
  Inventory,
  Product,
  ProductExternal,
  Purchase,
  User,
  UserExternal,
  Review,
} from '@graphmarket/entities';
import config from '@app/config';
import {
  InventoryResolver,
  ProductInventoryResolver,
  resolveInventoryReference,
  UserInventoryResolver,
} from '@app/resolvers';
import { URL } from 'url';

/**
 * Federated GraphQL schema.
 */
const schema = buildFederatedSchema(
  {
    resolvers: [InventoryResolver, ProductInventoryResolver, UserInventoryResolver],
    orphanedTypes: [Inventory, ProductExternal, UserExternal],
    container: Container,
  },
  {
    Inventory: { __resolveReference: resolveInventoryReference },
  },
);

/**
 * Service instance.
 */
const app = buildService({
  graphql: {
    schema,
    path: config.GRAPHQL.PATH,
    playground: config.GRAPHQL.PLAYGROUND,
  },
});

/**
 * Start listening at the given port.
 *
 * @param port - Listening port
 * @returns Address information
 */
const listen = (port: number): Promise<AddressInfo> =>
  new Promise((resolve, reject) => {
    const server = app
      .listen(port, () => {
        resolve(server.address() as AddressInfo);
      })
      .on('error', (error) => {
        reject(error);
      });
  });

/**
 * Create and returns a connection with the database.
 *
 * @returns Database connection
 */
const connectDatabase = (): Promise<Connection> => {
  const redisURL = new URL(config.REDIS.URL);

  return createConnection(<ConnectionOptions>{
    type: config.DATABASE.TYPE,
    url: config.DATABASE.URL,
    extra: {
      ssl: config.DATABASE.SSL,
    },
    synchronize: config.DATABASE.SYNCHRONIZE,
    dropSchema: config.DATABASE.DROP_SCHEMA,
    logging: config.DATABASE.LOGGING,
    entities: [Inventory, Product, User, Purchase, Review],
    cache: {
      type: 'ioredis',
      options: {
        host: redisURL.hostname,
        port: redisURL.port,
        password: redisURL.password,
      },
    },
  });
};

export default { listen, connectDatabase };
