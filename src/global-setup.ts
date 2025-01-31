import { type FullConfig } from '@playwright/test';
import { exec as syncExec } from 'node:child_process';
import { promisify } from 'node:util';
import { RelatedTestsConfig } from './config';
import { logger } from './logger';
import { RelationshipManager } from './relationship';
import { S3Connector, type TRemoteConnector } from './connectors';
import type { Constructor } from './types';

const exec = promisify(syncExec);

async function findRelatedTests(
  remoteConnector: Constructor<TRemoteConnector>,
  fromRemotePath: string,
): Promise<{
  impactedTestFiles: string[];
  impactedTestNames: string[];
}> {
  const { stdout } = await exec('git diff --name-only HEAD');
  const modifiedFiles = stdout.trim().split('\n');
  const relationShipManager = new RelationshipManager(
    modifiedFiles,
    remoteConnector,
  );

  await relationShipManager.init({ fromRemotePath });

  return relationShipManager.extractRelationships();
}

export async function getImpactedTestsRegex(
  remoteConnector: Constructor<TRemoteConnector> = S3Connector,
  fromRemotePath: string,
): Promise<RegExp | undefined> {
  const { impactedTestNames } = await findRelatedTests(
    remoteConnector,
    fromRemotePath,
  );

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
  fromRemotePath: string,
  remoteConnector: Constructor<TRemoteConnector> = S3Connector,
): Promise<void> {
  const regex = await getImpactedTestsRegex(remoteConnector, fromRemotePath);

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
