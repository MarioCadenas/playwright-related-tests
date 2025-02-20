import chalk from 'chalk';
import { logger } from '../logger';
import { LocalFileSystemConnector, type TRemoteConnector } from '../connectors';
import { AFFECTED_FILES_FOLDER, RELATIONSHIP_TYPES } from '../constants';
import type { RelationshipType, Constructor } from '../types';
import type {
  ConnectorOptions,
  EndpointConnectorParamsOptions,
  S3ConnectorParamsOptions,
} from '../connectors/types';

interface InitSkipOptions {
  skipDownload: true;
}

interface InitOptions {
  skipDownload?: false;
  type?: RelationshipType;
  options?: ConnectorOptions;
}

export class RelationshipManager<T extends TRemoteConnector> {
  private impactedTestFiles: Set<string>;
  private impactedTestNames: Set<string>;
  private modifiedFiles: string[];
  private connectors: {
    local: LocalFileSystemConnector;
    remote: TRemoteConnector | undefined;
  };

  constructor(
    currentlyChangedFiles: string[],
    RemoteConnector: Constructor<T> | undefined,
  ) {
    this.impactedTestFiles = new Set<string>();
    this.impactedTestNames = new Set<string>();
    this.modifiedFiles = currentlyChangedFiles;

    this.connectors = {
      local: new LocalFileSystemConnector(AFFECTED_FILES_FOLDER),
      remote: RemoteConnector ? new RemoteConnector() : undefined,
    };

    this._init();
  }

  private _init() {
    this.connectors.local.init();
  }

  async init(options: InitSkipOptions | InitOptions) {
    if (options.skipDownload) return;

    const { type = RELATIONSHIP_TYPES.MAIN, options: downloadOptions } =
      options;

    if (downloadOptions) {
      await this.download(type, downloadOptions);
    }
  }

  private collectAffectedFiles() {
    /**
     * This might  need to use a connector like the local connector, or the s3 connector to load the files from
     * an s3 bucket.
     */

    const files = this.connectors.local.getFiles();

    for (const file of files) {
      const affected = this.connectors.local.getFileContent(file);
      const affectedFiles: string[] = JSON.parse(affected);

      const impacted = affectedFiles.some((f) =>
        this.modifiedFiles.includes(f),
      );

      if (impacted) {
        const fileName = file.replace('.json', '').split(' ')[0]!.trim();
        const exactFileName = fileName.replaceAll('~', '/');
        const exactTestName = file
          .replace('.json', '')
          .replace(fileName, '')
          .trim();

        this.impactedTestFiles.add(exactFileName);
        this.impactedTestNames.add(`${exactFileName} ${exactTestName}`);
      }
    }
  }

  extractRelationships() {
    this.collectAffectedFiles();

    const impactedTestFiles = Array.from(this.impactedTestFiles);
    const impactedTestNames = Array.from(this.impactedTestNames);

    // TODO: improve this log
    if (impactedTestFiles?.length) {
      logger.debug(`Running only impacted tests files \n
${chalk.cyan(Array.from(impactedTestFiles).join('\n\n'))}
`);
    }

    return {
      impactedTestFiles,
      impactedTestNames,
    };
  }

  async syncLocal(filesPath: string) {
    await this.connectors.local.sync(filesPath);
  }

  async download(type: RelationshipType, options: ConnectorOptions) {
    const downloadPath = await this.connectors.remote?.download(
      type,
      options as S3ConnectorParamsOptions & EndpointConnectorParamsOptions,
    );

    if (!downloadPath) return;

    await this.syncLocal(downloadPath);
  }

  async upsync(
    type: RelationshipType,
    options: ConnectorOptions,
  ): Promise<void> {
    logger.debug(
      `Synchronizing relationship files to remote for type: ${type}`,
    );
    await this.connectors.remote?.upload(
      type,
      this.connectors.local.getFolder(),
      options as S3ConnectorParamsOptions & EndpointConnectorParamsOptions,
    );
  }
}
