module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@main/(.*)$': '<rootDir>/main/$1',
    '^@types$': '<rootDir>/types',
    '^@scripts/(.*)$': '<rootDir>/scripts/$1',
  },
  collectCoverageFrom: [
    'main/utils/**/*.ts',
    'main/database/controllers/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
