import { test, type Coverage, type Page } from '@playwright/test';
import { RelatedTestsConfig } from '../config';
import { FilePreparator } from '../file-preparator';
import { getSourceMap } from './source-map';
import type { CoverageReport } from './types';
import { LocalFileSystemConnector } from '../connectors';
import { AFFECTED_FILES_FOLDER } from '../constants';

/** @internal */
const extendedTest = test.extend<{ page: Page }>({
  page: async ({ page }, use: (r: Page) => Promise<void>) => {
    const testInfo = test.info();

    await safeCoverageMethod(page, 'startJSCoverage');

    await use(page);

    const coverage = await safeCoverageMethod(page, 'stopJSCoverage');

    if (coverage) {
      const localConnector = new LocalFileSystemConnector(
        AFFECTED_FILES_FOLDER,
      );

      await storeAffectedFiles(
        testInfo.titlePath.join(' - ').replaceAll('/', '~'),
        testInfo.file,
        coverage,
        localConnector,
      );

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

async function storeAffectedFiles(
  testName: string,
  file: string,
  coverage: CoverageReport[],
  localConnector: LocalFileSystemConnector,
) {
  const rtc = RelatedTestsConfig.instance;
  const rtcConfig = rtc.getConfig();
  const filePreparator = new FilePreparator(rtcConfig);

  return Promise.all(
    coverage.map(async (entry) => {
      if (entry.url.includes(rtcConfig.url)) {
        if (!entry.source) return;

        const sourceMap = await getSourceMap(entry);

        if (sourceMap) {
          const sources = [...sourceMap.sources, file]
            .filter(filePreparator.outOfProjectFiles)
            .map(filePreparator.toGitComparable);

          const files = new Set(sources);

          for (const source of files.values()) {
            localConnector.addRelationship(testName, source);
          }
        } else {
          // TODO: Improve how we store the name of the file
          // TODO: Add test file name
          if (!filePreparator.ignorePatternChecker(entry.url)) {
            localConnector.addRelationship(
              testName,
              entry.url.replace(rtcConfig.url + '/', ''),
            );
          }
        }
      }
    }),
  );
}
