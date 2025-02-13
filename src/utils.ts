import type { JSONReportSuite } from '@playwright/test/reporter';
import { exec as syncExec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { CONFIG_FOLDER } from './constants';

const exec = promisify(syncExec);

export function generateUniqueId(): string {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000000);

  return `${timestamp}-${randomNum}`;
}

export async function getPWTestList() {
  const recursiveFlatMap = (
    testSuites?: JSONReportSuite[],
  ): JSONReportSuite[] =>
    (testSuites || []).flatMap(({ suites, ...rest }) => [
      rest,
      ...recursiveFlatMap(suites),
    ]);

  const jsonReportPath = path.join(CONFIG_FOLDER, 'test-list.json');
  try {
    await exec(
      `PLAYWRIGHT_JSON_OUTPUT_FILE=${jsonReportPath} npx playwright test --reporter json --list`,
    );
    const jsonReport = JSON.parse(
      fs.readFileSync(jsonReportPath, 'utf8').toString(),
    );
    return recursiveFlatMap(jsonReport.suites);
  } catch (error) {
    return [];
  }
}
