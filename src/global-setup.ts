import { type FullConfig } from '@playwright/test';
import { exec as syncExec } from 'node:child_process';
import path from 'node:path';
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
import { getPWTestList } from './utils';

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
  // TODO: We might need to allow configuring the master/main branch
  const { stdout: againstMaster } = await exec(
    `git diff --name-only master...HEAD`,
  );
  const { stdout: nonStaged } = await exec('git diff --name-only HEAD');
  const againstMasterModifiedFiles = againstMaster.trim().split('\n');
  const nonStagedModifiedFiles = nonStaged.trim().split('\n');
  const modifiedFiles = Array.from(
    new Set([...nonStagedModifiedFiles, ...againstMasterModifiedFiles]),
  );
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

async function findNewlyAddedTests() {
  const listOfNewTests: string[] = [];

  const [
    testListPromise,
    untrackedFilesPromise,
    untrackedFilesAgainstMasterPromise,
  ] = await Promise.allSettled([
    getPWTestList(),
    exec('git ls-files --others --exclude-standard'),
    exec('git diff --name-only --diff-filter=A master..HEAD'),
  ]);

  if (
    untrackedFilesPromise.status === 'rejected' ||
    testListPromise.status === 'rejected' ||
    untrackedFilesAgainstMasterPromise.status === 'rejected'
  ) {
    return listOfNewTests;
  }

  const { stdout: newFilesComparedWithHead } = untrackedFilesPromise.value;
  const { stdout: newFilesComparedWithMaster } =
    untrackedFilesAgainstMasterPromise.value;
  if (!newFilesComparedWithHead && !newFilesComparedWithMaster) {
    return listOfNewTests;
  }

  const untrackedFiles = newFilesComparedWithHead
    .concat(newFilesComparedWithMaster)
    .trim()
    .split('\n')
    .map((file) => path.basename(file))
    .filter((file) => file.includes('.spec.') || file.includes('.test.'));

  const testList = testListPromise.value;
  for (const test of testList) {
    for (const spec of test.specs) {
      if (untrackedFiles.includes(test.file)) {
        listOfNewTests.push(`${test.file} ${test.title} ${spec.title}`);
      }
    }
  }

  return listOfNewTests;
}

export async function getImpactedTestsRegex(
  type?: RelationshipType,
  options?: ConnectorOptions,
  remoteConnector:
    | Constructor<TRemoteConnector>
    | undefined = typeof options === 'string' ? S3Connector : undefined,
): Promise<RegExp | undefined> {
  const [{ impactedTestNames }, newTests] = await Promise.all([
    findRelatedTests(type, options, remoteConnector),
    findNewlyAddedTests(),
  ]);

  if (impactedTestNames.length === 0 && newTests.length === 0) {
    logger.debug(`No tests impacted by changes`);
    return;
  }

  const escapedTitles = impactedTestNames
    .concat(newTests)
    .map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

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
