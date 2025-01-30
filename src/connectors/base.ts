import type { RelationshipType } from '../types';

export abstract class BaseConnector {
  constructor() {}
}

export abstract class LocalConnector extends BaseConnector {
  protected folder: string;

  constructor(folder: string) {
    super();
    this.folder = folder;
  }

  abstract sync(filesPath: string): Promise<void>;
}

export abstract class RemoteConnector extends BaseConnector {
  abstract download(): Promise<string>;

  abstract upload(type: RelationshipType, folder: string): Promise<void>;
}
