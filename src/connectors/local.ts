import fs from 'node:fs';
import path from 'node:path';

import { LocalConnector } from './base';
import { logger } from '../logger';

type AffectedFiles = Map<string, Set<string>>;

export class LocalFileSystemConnector extends LocalConnector {
  private affectedFiles: AffectedFiles;

  constructor(args: string) {
    super(args);

    this.affectedFiles = new Map();

    this.init();
  }

  async sync(filesPath: string): Promise<void> {
    if (!fs.existsSync(filesPath)) {
      logger.warn(
        `The path ${filesPath} does not exist, there was nothing to sync.`,
      );
      return;
    }

    if (
      fs.existsSync(this.folder) &&
      fs.readdirSync(this.folder).length !== 0
    ) {
      logger.log(
        `Folder with affected files already exists locally, skipping sync.`,
      );
      return;
    }

    if (fs.readdirSync(this.folder).length === 0) {
      fs.rmSync(this.folder, { recursive: true });
    }

    return await fs.promises.cp(
      path.join(filesPath, this.folderName),
      this.folder,
      { recursive: true },
    );
  }

  getFolder() {
    return this.folder;
  }

  init() {
    if (!fs.existsSync(this.folder)) {
      fs.mkdirSync(this.folder, { recursive: true });
    }
  }

  getFiles() {
    return fs.readdirSync(this.folder);
  }

  getFileContent(file: string) {
    return fs.readFileSync(path.join(this.folder, file), 'utf-8');
  }

  exists(testName: string) {
    return fs.existsSync(path.join(this.folder, `${testName}.json`));
  }

  addRelationship(testName: string, fileName: string) {
    if (fileName.length === 0) return;

    if (this.affectedFiles.has(testName)) {
      this.affectedFiles.get(testName)?.add(fileName);
    } else {
      this.affectedFiles.set(testName, new Set([fileName]));
    }
  }

  writeAffectedFiles() {
    for (const [testName, files] of this.affectedFiles.entries()) {
      logger.debug(
        `Writing the following files: \n${Array.from(files.values()).join('\n')}`,
      );
      fs.writeFileSync(
        path.join(this.folder, `${testName}.json`),
        JSON.stringify(Array.from(files.values()), null, 2),
      );
    }
  }
}
