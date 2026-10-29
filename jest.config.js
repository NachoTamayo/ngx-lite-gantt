/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  clearMocks: true,
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/lib/**/*.ts', '!src/lib/**/*.spec.ts'],
};
