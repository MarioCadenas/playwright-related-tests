import { RemoteConnector } from './base';

export type TRemoteConnector = typeof S3Connector;

export class S3Connector extends RemoteConnector {
  constructor() {
    super();
  }

  download(): Promise<string> {
    // download tar or zip from s3, and maybe extract it. Return the path where the file is
    // We should maintain a cache of the downloaded files, so we don't download the same file multiple times.
    return Promise.resolve('/path/to/file');
  }

  upload(folder: string): Promise<void> {
    // create tar or zip from folder and upload it.

    return Promise.resolve(undefined);
  }
}
