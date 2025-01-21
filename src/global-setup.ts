import { type FullConfig } from '@playwright/test';
import { exec as syncExec } from 'node:child_process';
import { promisify } from 'node:util';
import { RelatedTestsConfig } from './config';
import { logger } from './logger';
import { RelationshipManager } from './relationship';
import { S3Connector } from './connectors';

const exec = promisify(syncExec);

async function findRelatedTests(): Promise<{
  impactedTestFiles: string[];
  impactedTestNames: string[];
}> {
  const { stdout } = await exec('git diff --name-only HEAD');
  const modifiedFiles = stdout.trim().split('\n');
  const relationShipManager = new RelationshipManager(
    modifiedFiles,
    S3Connector,
  );

  await relationShipManager.init();

  return relationShipManager.extractRelationships();
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
