import type { RelationshipType } from '../types';

export abstract class BaseConnector {
  constructor() {}
}

export abstract class LocalConnector extends BaseConnector {
  protected folder: string;
  protected folderName: string;

  constructor(folder: string) {
    super();
    this.folder = folder;
    this.folderName = folder.split('/').pop() || '';
  }

  abstract sync(filesPath: string): Promise<void>;
}

export abstract class RemoteConnector extends BaseConnector {
  abstract download(
    type: RelationshipType,
    fromPath: string,
  ): Promise<string | null>;

  abstract upload(
    type: RelationshipType,
    folder: string,
    destination: string,
  ): Promise<void>;
}
