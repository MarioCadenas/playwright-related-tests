import {
  test,
  type Coverage,
  type Page,
  type TestInfo,
} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { RelatedTestsConfig } from '../config';
import { FilePreparator } from '../file-preparator';
import { getSourceMap } from './source-map';
import type { CoverageReport } from './types';
import { LocalFileSystemConnector } from '../connectors';
import { AFFECTED_FILES_FOLDER } from '../constants';
import { logger } from '../logger';

type CoverageResult = Awaited<ReturnType<Coverage['stopJSCoverage']>>;

export interface PlaywrightRelatedTestsPage extends Page {
  stopJSCoverage: () => Promise<void | CoverageResult>;
  startJSCoverage: () => Promise<void>;
}

/** @internal */
const extendedTest = test.extend<{
  page: PlaywrightRelatedTestsPage;
}>({
  page: async (
    {
      page,
    }: {
      page: PlaywrightRelatedTestsPage;
    },
    use: (r: PlaywrightRelatedTestsPage) => Promise<void>,
  ) => {
    const testInfo = test.info();

    const coverageResult = {
      cov: undefined as void | CoverageResult,
      async startJSCoverage() {
        return await safeCoverageMethod(page, 'startJSCoverage');
      },
      async stopJSCoverage(): Promise<void | CoverageResult> {
        const coverage = await safeCoverageMethod(page, 'stopJSCoverage');

        if (coverage) {
          this.cov = coverage;
        }

        return this.cov;
      },
    };

    page.startJSCoverage = coverageResult.startJSCoverage.bind(coverageResult);
    page.stopJSCoverage = coverageResult.stopJSCoverage.bind(coverageResult);

    await page.startJSCoverage();

    await use(page);

    const coverage = await page.stopJSCoverage();

    if (coverage) {
      const localConnector = new LocalFileSystemConnector(
        AFFECTED_FILES_FOLDER,
      );

      await storeAffectedFiles(testInfo, coverage, localConnector);
      localConnector.writeAffectedFiles();
    }
  },
});

async function safeCoverageMethod<T extends keyof Coverage>(
  page: Page,
  method: T,
): Promise<Awaited<ReturnType<Coverage[T]> | void>> {
  try {
    return (await page.coverage[method]()) as any;
  } catch {
    // add debug log
    return undefined as any;
  }
}

export { extendedTest as test };
/** @internal */
export const expect = extendedTest.expect;

function safeReadDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function getProcessEnvValue(key: string): string {
  if (key.includes('process.env.')) {
    key = key.replace('process.env.', '');
  }

  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

async function storeAffectedFiles(
  testInfo: TestInfo,
  coverage: CoverageReport[],
  localConnector: LocalFileSystemConnector,
) {
  const testName = testInfo.titlePath.join(' ').replaceAll('/', '~');
  const file = testInfo.file;
  const snapshotsDir = testInfo.snapshotDir;
  const rtc = RelatedTestsConfig.instance;
  const rtcConfig = rtc.getConfig();
  const filePreparator = new FilePreparator(rtcConfig);

  const snapshotFiles = safeReadDir(snapshotsDir).map((file) => {
    return path.join(snapshotsDir, file);
  });
  // This will add the snapshot files to each json relation file, but we have no way to know which specific screenshots
  // are part of each test inside a test file.
  const testRelatedFiles = [file, ...snapshotFiles]
    .filter(filePreparator.outOfProjectFiles)
    .map(filePreparator.toGitComparable);

  for (const testRelatedFile of testRelatedFiles) {
    localConnector.addRelationship(testName, testRelatedFile);
  }

  const sourceMapHeaders = rtcConfig.sourceMapHeaders || {};
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(sourceMapHeaders)) {
    headers[key] = getProcessEnvValue(value);
  }

  return Promise.all(
    coverage.map(async (entry) => {
      if (!!rtcConfig.url && entry.url.includes(rtcConfig.url)) {
        if (!entry.source) {
          logger.warn(`${entry.url} has no source.`);
          return;
        }

        const sourceMap = await getSourceMap(entry, headers);

        if (sourceMap) {
          const sources = [...sourceMap.sources]
            .filter(filePreparator.outOfProjectFiles)
            .map(filePreparator.toGitComparable);

          const files = new Set(sources);

          for (const source of files.values()) {
            localConnector.addRelationship(testName, source);
          }
        } else {
          if (filePreparator.outOfProjectFiles(entry.url)) {
            const preparedFile = filePreparator.toGitComparable(
              entry.url.replace(rtcConfig.url + '/', ''),
            );

            localConnector.addRelationship(testName, preparedFile);
          }
        }
      }
    }),
  );
}
