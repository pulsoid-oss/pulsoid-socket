/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageProvider: 'v8',

  moduleFileExtensions: ['js', 'ts'],
  moduleDirectories: ['node_modules'],

  testMatch: ['**/?(*.)+(spec|test).[tj]s'],

  testPathIgnorePatterns: ['/node_modules/'],

  roots: ['<rootDir>'],
  transform: {'\\.ts$': 'ts-jest'},
};
