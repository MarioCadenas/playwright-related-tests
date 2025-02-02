import { test, type Coverage, type Page } from '@playwright/test';
import fs, { mkdirSync } from 'node:fs';
import path from 'node:path';
import { RelatedTestsConfig } from '../config';
import { FilePreparator } from '../file-preparator';
import { logger } from '../logger';
import { getSourceMap } from './source-map';
import type { CoverageReport } from './types';

type AffectedFiles = Map<string, Set<string>>;

const AFFECTED_FILES_FOLDER = '.affected-files';

/** @internal */
const extendedTest = test.extend<{ page: Page }>({
  page: async ({ page }, use: (r: Page) => Promise<void>) => {
    const affectedFiles: AffectedFiles = new Map();
    const testInfo = test.info();

    await safeCoverageMethod(page, 'startJSCoverage');

    await use(page);

    const coverage = await safeCoverageMethod(page, 'stopJSCoverage');

    if (coverage) {
      await storeAffectedFiles(
        testInfo.titlePath.join(' - ').replaceAll('/', '~'),
        testInfo.file,
        coverage,
        affectedFiles,
      );

      writeAffectedFiles(affectedFiles);
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

function addAffectedFile(
  testName: string,
  fileName: string,
  affectedFiles: AffectedFiles,
) {
  if (affectedFiles.has(testName)) {
    affectedFiles.get(testName)?.add(fileName);
  } else {
    affectedFiles.set(testName, new Set([fileName]));
  }
}

function writeAffectedFiles(affectedFiles: AffectedFiles) {
  if (!fs.existsSync(AFFECTED_FILES_FOLDER)) {
    mkdirSync(AFFECTED_FILES_FOLDER, { recursive: true });
  }

  for (const [testName, files] of affectedFiles.entries()) {
    logger.debug(
      `Writing the following files: \n${Array.from(files.values()).join('\n')}`,
    );
    fs.writeFileSync(
      path.join(AFFECTED_FILES_FOLDER, `${testName}.json`),
      JSON.stringify(Array.from(files.values()), null, 2),
    );
  }
}

async function storeAffectedFiles(
  testName: string,
  file: string,
  coverage: CoverageReport[],
  affectedFiles: AffectedFiles,
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
            addAffectedFile(testName, source, affectedFiles);
          }
        } else {
          // TODO: Improve how we store the name of the file
          // TODO: Add test file name
          if (!filePreparator.ignorePatternChecker(entry.url)) {
            addAffectedFile(
              testName,
              entry.url.replace(rtcConfig.url + '/', ''),
              affectedFiles,
            );
          }
        }
      }
    }),
  );
}
