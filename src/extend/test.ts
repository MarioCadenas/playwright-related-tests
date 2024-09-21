import fs, { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test, type Coverage, type Page } from '@playwright/test';
import { LOCALHOST } from './constants';

type CoverageReportRange = {
  count: number;
  startOffset: number;
  endOffset: number;
};

type CoverageReportFunction = {
  functionName: string;
  isBlockCoverage: boolean;
  ranges: CoverageReportRange[];
};

type CoverageReport = {
  url: string;
  scriptId: string;
  source?: string;
  functions: CoverageReportFunction[];
};

const AFFECTED_FILES_FOLDER = '.affected-files';

const extendedTest = test.extend({
  page: async ({ page }, use) => {
    const affectedFiles = new Map<string, string[]>();
    const testInfo = await test.info();

    await safeCoverageMethod(page, 'startJSCoverage');

    await use(page);

    const coverage = await safeCoverageMethod(page, 'stopJSCoverage');

    if (coverage) {
      await storeAffectedFiles(
        testInfo.titlePath.join(' - '),
        coverage,
        affectedFiles,
      );

      await writeAffectedFiles(affectedFiles);
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
export const expect = extendedTest.expect;

function addAffectedFile(
  testName: string,
  fileName: string,
  affectedFiles: Map<string, string[]>,
) {
  if (affectedFiles.has(testName)) {
    affectedFiles.get(testName)?.push(fileName);
  } else {
    affectedFiles.set(testName, [fileName]);
  }
}

function writeAffectedFiles(affectedFiles: Map<string, string[]>) {
  if (!fs.existsSync(AFFECTED_FILES_FOLDER)) {
    mkdirSync(AFFECTED_FILES_FOLDER, { recursive: true });
  }

  for (const [testName, files] of affectedFiles.entries()) {
    console.log(testName, files);
    fs.writeFileSync(
      path.join(AFFECTED_FILES_FOLDER, `${testName}.json`),
      JSON.stringify(files, null, 2),
    );
  }
}

async function storeAffectedFiles(
  testName: string,
  coverage: CoverageReport[],
  affectedFiles: Map<string, string[]>,
) {
  return Promise.all(
    coverage.map(async (entry) => {
      // TODO: URL matching should be configured by the user
      if (entry.url.includes('src')) {
        addAffectedFile(
          testName,
          // TODO: url replace should be configured by the user
          entry.url.replace(LOCALHOST + '/', ''),
          affectedFiles,
        );
      }
    }),
  );
}
