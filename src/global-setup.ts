import fs from 'node:fs';
import path from 'node:path';
import { exec as syncExec } from 'node:child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';
import type { FullConfig } from '@playwright/test';

const exec = promisify(syncExec);

async function findRelatedTests(): Promise<{
  impactedTestFiles: string[];
  impactedTestNames: string[];
}> {
  const impactedTestFiles = [];
  const impactedTestNames = [];
  const { stdout } = await exec('git diff --name-only');
  const modifiedFiles = stdout.trim().split('\n');

  const files = fs.readdirSync(path.join(process.cwd(), '.affected-files'));

  for (const file of files) {
    const affected = fs.readFileSync(
      path.join(process.cwd(), '.affected-files', file),
      'utf-8',
    );
    const affectedFiles: string[] = JSON.parse(affected);

    const impacted = affectedFiles.some((f) => modifiedFiles.includes(f));

    if (impacted) {
      const fileName = file.replace('.json', '').split(' - ')[0]!;

      impactedTestFiles.push(fileName);
      impactedTestNames.push(
        file
          .replace('.json', '')
          .replace(fileName, '')
          .replace(' - ', '')
          .replaceAll(' - ', ' ')
          .trim(),
      );
    }
  }

  console.log(`
Running only impacted tests files \n
${chalk.cyan(impactedTestFiles.join('\n\n'))}
`);

  return { impactedTestFiles, impactedTestNames };
}

export default async function globalSetup(config: FullConfig) {
  const { impactedTestNames } = await findRelatedTests();

  if (impactedTestNames.length === 0) {
    console.log('No tests to run');
    return '';
  }

  const escapedTitles = impactedTestNames.map((title) =>
    title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );

  const regexPattern = escapedTitles.join('|');

  const testTitleRegex = new RegExp(`(${regexPattern})$`);

  console.log(impactedTestNames);
  console.log(testTitleRegex);

  config.grep = testTitleRegex;

  config.projects.forEach((project) => {
    project.grep = testTitleRegex;
  });
}
