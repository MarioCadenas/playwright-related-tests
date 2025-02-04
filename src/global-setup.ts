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
import type {
  ConnectorOptions,
  EndpointConnectorParamsOptions,
  S3ConnectorParamsOptions,
} from './connectors/types';
import type { Constructor, RelationshipType } from './types';

const exec = promisify(syncExec);

type RelatedTests = Promise<{
  impactedTestFiles: string[];
  impactedTestNames: string[];
}>;

async function findRelatedTests(
  type?: RelationshipType,
  options?: ConnectorOptions,
  remoteConnector:
    | Constructor<TRemoteConnector>
    | undefined = typeof options === 'string' ? S3Connector : undefined,
): RelatedTests {
  const { stdout } = await exec('git diff --name-only HEAD');
  const modifiedFiles = stdout.trim().split('\n');
  const relationShipManager = new RelationshipManager(
    modifiedFiles,
    remoteConnector,
  );
  await relationShipManager.init({
    type,
    options,
  });

  return relationShipManager.extractRelationships();
}

export async function getImpactedTestsRegex(
  type?: RelationshipType,
  options?: ConnectorOptions,
  remoteConnector:
    | Constructor<TRemoteConnector>
    | undefined = typeof options === 'string' ? S3Connector : EndpointConnector,
): Promise<RegExp | undefined> {
  const { impactedTestNames } = await findRelatedTests(
    type,
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
  type?: RelationshipType,
  options?: S3ConnectorParamsOptions,
  remoteConnector?: Constructor<S3Connector>,
): Promise<void>;
export async function updateConfigWithImpactedTests(
  config: FullConfig,
  type?: RelationshipType,
  options?: EndpointConnectorParamsOptions,
  remoteConnector?: Constructor<EndpointConnector>,
): Promise<void>;
export async function updateConfigWithImpactedTests(
  config: FullConfig,
  type?: RelationshipType,
  options?: ConnectorOptions,
  remoteConnector:
    | Constructor<TRemoteConnector>
    | undefined = typeof options === 'string' ? S3Connector : undefined,
): Promise<void> {
  const regex = await getImpactedTestsRegex(type, options, remoteConnector);

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
