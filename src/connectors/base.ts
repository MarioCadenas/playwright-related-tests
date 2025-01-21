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

  abstract upload(folder: string): Promise<void>;
}
