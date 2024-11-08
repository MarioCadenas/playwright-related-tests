import fs, { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test, type Coverage, type Page } from '@playwright/test';
import { RelatedTestsConfig } from '../config';
import fetch from 'isomorphic-fetch';

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

type SourceMap = {
  version: number;
  sources: string[];
  names: string[];
  mappings: string;
  file: string;
  sourcesContent: string[];
  sourceRoot: string;
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
  const rtc = RelatedTestsConfig.instance;
  const rtcConfig = rtc.getConfig();

  return Promise.all(
    coverage.map(async (entry) => {
      if (entry.url.includes(rtcConfig.url)) {
        if (!entry.source) return;

        const sourceMap = await getSourceMap(entry);

        if (sourceMap) {
          const sources = sourceMap.sources
            .filter(outOfProjectFiles)
            .map(toGitComparable);
          const files = new Set(sources);

          for (const source of files.values()) {
            const affectedFile = toGitComparable(source);

            addAffectedFile(testName, affectedFile, affectedFiles);
          }
        } else {
          if (entry.url.includes(rtcConfig.assetUrlMatching)) {
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

function outOfProjectFiles(source: string) {
  return !source.startsWith('../') && !source.startsWith('webpack');
}

function toGitComparable(path: string) {
  let normalizedPath = path.replace(/\\/g, '/');

  if (normalizedPath.startsWith('./')) {
    normalizedPath = normalizedPath.substring(2);
  }

  // Remove query params
  normalizedPath = normalizedPath.replace(/\?.*$/, '');

  return normalizedPath;
}

function fixSourceMap(sourceMap: SourceMap) {
  if (!sourceMap || sourceMap.sources.length === 0) {
    return undefined;
  }
  return {
    ...sourceMap,
    sources: sourceMap.sources.map((sourcePath) =>
      sourcePath.replace(/^webpack:\/\/\//, ''),
    ),
  };
}

async function getSourceMap(entry: CoverageReport) {
  // TODO: This should be removed
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
  const base64Header = 'data:application/json;charset=utf-8;base64,';
  const match = [
    ...(entry.source ?? '').matchAll(/\/\/# sourceMappingURL=(.*)/g),
  ].map((match) => match[1]);

  const sourceMappingBase64 = match.find((sourceMap) =>
    sourceMap?.startsWith(base64Header),
  );

  if (sourceMappingBase64) {
    const buffer = Buffer.from(
      sourceMappingBase64.slice(base64Header.length),
      'base64',
    );

    return fixSourceMap(JSON.parse(buffer.toString()));
  }

  const sourceMappingURL = match.find((sourceMap) =>
    sourceMap?.startsWith('https'),
  );

  if (sourceMappingURL) {
    try {
      const response = await fetch(sourceMappingURL).then((r) => r.json());

      console.log(response);

      return fixSourceMap(response);
    } catch (error) {
      console.error(error);
    }

    // const possibleSourceMaps = [sourceMappingURL];
    // const responses = await Promise.allSettled(
    //   possibleSourceMaps.map((url) => fetch(url))
    // );

    // console.log(responses);
    // const response = responses.find(
    //   (result) => result.status === "fulfilled" && result.value?.status === 200
    // )?.value;
    // return fixSourceMap(await response?.json());
  }

  return undefined;
}
