import { type FullConfig } from '@playwright/test';
import { exec as syncExec } from 'node:child_process';
import { promisify } from 'node:util';
import { RelatedTestsConfig } from './config';
import { logger } from './logger';
import { RelationshipManager } from './relationship';
import {
  EndpointConnector,
  S3Connector,
  type TRemoteConnector,
} from './connectors';
import type { Constructor } from './types';

const exec = promisify(syncExec);

type ConnectorOptions = {
  fromRemotePath?: string;
  headers?: Record<string, string>;
};

async function findRelatedTests(
  options: ConnectorOptions,
  // TODO improve this, it's a bit hacky
  remoteConnector: Constructor<TRemoteConnector> | undefined = !options.headers
    ? S3Connector
    : undefined,
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

  await relationShipManager.init({
    fromRemotePath: options?.fromRemotePath,
    headers: options?.headers,
  });

  return relationShipManager.extractRelationships();
}

export async function getImpactedTestsRegex(
  options: ConnectorOptions,
  // TODO improve this, it's a bit hacky
  remoteConnector: Constructor<TRemoteConnector> | undefined = !options.headers
    ? S3Connector
    : EndpointConnector,
): Promise<RegExp | undefined> {
  const { impactedTestNames } = await findRelatedTests(
    options,
    remoteConnector,
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
  // TODO improve this, it's a bit hacky
  options: ConnectorOptions,
  remoteConnector: Constructor<TRemoteConnector> | undefined = !options?.headers
    ? S3Connector
    : EndpointConnector,
): Promise<void> {
  const regex = await getImpactedTestsRegex(options, remoteConnector);

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
