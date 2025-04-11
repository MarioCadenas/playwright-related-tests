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
import { LocalFileSystemConnector } from '../connectors';
import { AFFECTED_FILES_FOLDER } from '../constants';
import { logger } from '../logger';
import {
  type JSCoverageReport,
  type CSSCoverageReport,
  type CoverageEntry,
  type JSCoverageEntry,
  type CSSCoverageEntry,
} from './types';

type PageReload = ReturnType<Page['reload']>;

export interface PlaywrightRelatedTestsPage extends Page {
  stopJSCoverage: () => Promise<void | JSCoverageReport>;
  startJSCoverage: () => Promise<void>;
  stopCSSCoverage: () => Promise<void | CSSCoverageReport>;
  startCSSCoverage: () => Promise<void>;
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
      cov: [] as JSCoverageReport,
      cssCoverage: [] as CSSCoverageReport,
      async startJSCoverage() {
        return await safeCoverageMethod(page, 'startJSCoverage');
      },
      async stopJSCoverage(): Promise<void | JSCoverageReport> {
        const coverage = await safeCoverageMethod(page, 'stopJSCoverage');

        if (coverage) {
          this.cov.push(...coverage);
        }

        return this.cov;
      },
      async startCSSCoverage() {
        return await safeCoverageMethod(page, 'startCSSCoverage');
      },
      async stopCSSCoverage(): Promise<void | CSSCoverageReport> {
        const coverage = await safeCoverageMethod(page, 'stopCSSCoverage');

        if (coverage) {
          this.cssCoverage.push(...coverage);
        }

        return this.cssCoverage;
      },
    };

    const pageReload = page.reload.bind(page);

    page.startJSCoverage = coverageResult.startJSCoverage.bind(coverageResult);
    page.stopJSCoverage = coverageResult.stopJSCoverage.bind(coverageResult);
    page.startCSSCoverage =
      coverageResult.startCSSCoverage.bind(coverageResult);
    page.stopCSSCoverage = coverageResult.stopCSSCoverage.bind(coverageResult);

    page.reload = async function reload(...args): PageReload {
      await Promise.all([page.stopJSCoverage(), page.stopCSSCoverage()]);
      const result = await pageReload(...args);
      await Promise.all([page.startJSCoverage(), page.startCSSCoverage()]);
      return result;
    };

    await Promise.all([page.startJSCoverage(), page.startCSSCoverage()]);

    await use(page);

    const [jsCoverage, cssCoverage] = await Promise.all([
      page.stopJSCoverage(),
      page.stopCSSCoverage(),
    ]);
    const coverage = [...(jsCoverage ?? []), ...(cssCoverage ?? [])];
    const testName = testInfo.titlePath.join(' ').replaceAll('/', '~').trim();
    const localConnector = new LocalFileSystemConnector(AFFECTED_FILES_FOLDER);

    if (coverage && coverage.length > 0) {
      await storeAffectedFiles(testName, testInfo, coverage, localConnector);
      localConnector.writeAffectedFiles();
    } else {
      // We need to check if it exists in case it was written by a browser with coverage before.
      // to avoid overwriting the file. If that happens then we mark this file as always run,
      // since we can't know which files are related to it.
      if (!localConnector.exists(testName)) {
        await storeAffectedFiles(
          `${testName}--always-run`,
          testInfo,
          [],
          localConnector,
        );
        localConnector.writeAffectedFiles();
      }
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
  testName: string,
  testInfo: TestInfo,
  coverage: CoverageEntry[],
  localConnector: LocalFileSystemConnector,
) {
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
      const isJSCoverage = 'source' in entry;
      const isCSSCoverage = 'text' in entry;

      if (!!rtcConfig.url && entry.url.includes(rtcConfig.url)) {
        if (isJSCoverage && !entry.source) {
          logger.warn(`${entry.url} has no source.`);
          return;
        }

        if (isCSSCoverage && !entry.text) {
          logger.warn(`${entry.url} has no text.`);
          return;
        }

        if (isJSCoverage || isCSSCoverage) {
          const sourceMap = await getSourceMap(
            isJSCoverage
              ? { entry: entry as JSCoverageEntry, key: 'source' }
              : { entry: entry as CSSCoverageEntry, key: 'text' },
            headers,
          );

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
        } else if (filePreparator.outOfProjectFiles(entry.url)) {
          const preparedFile = filePreparator.toGitComparable(
            entry.url.replace(rtcConfig.url + '/', ''),
          );

          localConnector.addRelationship(testName, preparedFile);
        }
      }
    }),
  );
}
