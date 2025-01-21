import { type FullConfig } from '@playwright/test';
import {
  RelatedTestsConfig,
  updateConfigWithImpactedTests,
} from '../../src/index';

export default async function globalSetup(config: FullConfig) {
  RelatedTestsConfig.init({
    affectedIgnorePatterns: ['@react-refresh', '@vite/client', 'node_modules'],
    url: 'http://localhost:5173',
    exitProcess: false,
  });

  await updateConfigWithImpactedTests(config);
}
