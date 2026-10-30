import { testDatabaseUrl } from './test-database';

// Runs before each test file, so the app under test connects to the test database.
process.env.DATABASE_URL = testDatabaseUrl();
