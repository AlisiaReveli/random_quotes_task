module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
      '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts',
      '!src/app.ts',
    ],
    setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
    testTimeout: 10000,
    maxWorkers: 1,
    // Load test environment variables
    setupFiles: ['<rootDir>/src/tests/env-setup.ts'],
  };