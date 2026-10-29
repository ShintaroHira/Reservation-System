import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadDotEnv, validateEnv } from '../config/env';
import { buildDataSourceOptions } from './data-source-options';

// Entry point for the TypeORM CLI (`npm run migration:run`, `migration:show`, ...).
loadDotEnv();

export default new DataSource(buildDataSourceOptions(validateEnv(process.env)));
