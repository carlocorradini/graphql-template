import { createConnection, ConnectionOptions } from 'typeorm';
import { User } from '../src/entities';

export default async () => {
  await createConnection(<ConnectionOptions>{
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password',
    database: 'graphmarket-test',
    synchronize: true,
    dropSchema: true,
    logging: false,
    entities: [User],
    cache: {
      type: 'ioredis',
      port: 'redis://:password@localhost:6379/1',
    },
  });
};