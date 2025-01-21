export abstract class BaseConnector {
  protected fileList: string[];

  constructor(fileList: string[]) {
    this.fileList = fileList;
  }
}

export abstract class LocalConnector extends BaseConnector {
  abstract sync(): Promise<void>;
}

export abstract class RemoteConnector extends BaseConnector {
  abstract download(): Promise<void>;

  abstract upload(): Promise<void>;
}
