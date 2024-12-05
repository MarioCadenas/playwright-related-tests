import { type FullConfig } from '@playwright/test';
import chalk from 'chalk';
import { exec as syncExec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { RelatedTestsConfig } from './config';
import { logger } from './logger';

const exec = promisify(syncExec);

async function findRelatedTests(): Promise<{
  impactedTestFiles: string[];
  impactedTestNames: string[];
}> {
  const impactedTestFiles = new Set<string>();
  const impactedTestNames = new Set<string>();
  const { stdout } = await exec('git diff --name-only HEAD');
  const modifiedFiles = stdout.trim().split('\n');
  const relatedTestsFolder = path.join(process.cwd(), '.affected-files');

  if (!fs.existsSync(relatedTestsFolder)) {
    return {
      impactedTestFiles: [],
      impactedTestNames: [],
    };
  }

  const files = fs.readdirSync(relatedTestsFolder);

  for (const file of files) {
    const affected = fs.readFileSync(
      path.join(process.cwd(), '.affected-files', file),
      'utf-8',
    );
    const affectedFiles: string[] = JSON.parse(affected);

    const impacted = affectedFiles.some((f) => modifiedFiles.includes(f));

    if (impacted) {
      const fileName = file.replace('.json', '').split(' - ')[0]!;
      const exactFileName = fileName.replaceAll('~', '/');
      const exactTestName = file
        .replace('.json', '')
        .replace(fileName, '')
        .replace(' - ', '')
        .replaceAll(' - ', ' ')
        .trim();

      impactedTestFiles.add(exactFileName);
      impactedTestNames.add(`${exactFileName} ${exactTestName}`);
    }
  }

  logger.log(`Running only impacted tests files \n
${chalk.cyan(Array.from(impactedTestFiles).join('\n\n'))}
`);

  return {
    impactedTestFiles: Array.from(impactedTestFiles),
    impactedTestNames: Array.from(impactedTestNames),
  };
}

export async function getImpactedTestsRegex(): Promise<RegExp | undefined> {
  const { impactedTestNames } = await findRelatedTests();

  if (impactedTestNames.length === 0) {
    logger.debug(`No tests impacted by changes`);
    return;
  }

  const escapedTitles = impactedTestNames.map((title) =>
    title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );

  const regexPattern = escapedTitles.join('|');

  const testTitleRegex = new RegExp(`(${regexPattern})$`);

  logger.debug(
    `Matching these tests:\n
${testTitleRegex}
    `,
  );

  return testTitleRegex;
}

export async function updateConfigWithImpactedTests(
  config: FullConfig,
): Promise<void> {
  const regex = await getImpactedTestsRegex();

  if (regex) {
    config.grep = regex;

    config.projects.forEach((project) => {
      project.grep = regex;
    });
  } else {
    const rtc = RelatedTestsConfig.instance;
    const rtcConfig = rtc.getConfig();

    if (rtcConfig.exitProcess) {
      process.exit(0);
    }
  }
}
