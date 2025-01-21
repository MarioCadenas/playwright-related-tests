import fs from 'node:fs/promises';
import path from 'node:path';

import { LocalConnector } from './base';

export class LocalFileSystemConnector extends LocalConnector {
  sync(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
