import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import { logger } from '../logger';

export class RelationshipManager {
  private folder: string;
  private impactedTestFiles: Set<string>;
  private impactedTestNames: Set<string>;
  private modifiedFiles: string[];

  constructor(currentlyChangedFiles: string[]) {
    this.folder = path.join(process.cwd(), '.affected-files');
    this.impactedTestFiles = new Set<string>();
    this.impactedTestNames = new Set<string>();
    this.modifiedFiles = currentlyChangedFiles;

    this.init();
  }

  private init() {
    if (!fs.existsSync(this.folder)) {
      fs.mkdirSync(this.folder);
    }
  }

  private collectAffectedFiles() {
    /**
     * This might  need to use a connector like the local connector, or the s3 connector to load the files from
     * an s3 bucket.
     */

    const files = fs.readdirSync(this.folder);

    for (const file of files) {
      const affected = fs.readFileSync(path.join(this.folder, file), 'utf-8');
      const affectedFiles: string[] = JSON.parse(affected);

      const impacted = affectedFiles.some((f) =>
        this.modifiedFiles.includes(f),
      );

      if (impacted) {
        const fileName = file.replace('.json', '').split(' - ')[0]!;
        const exactFileName = fileName.replaceAll('~', '/');
        const exactTestName = file
          .replace('.json', '')
          .replace(fileName, '')
          .replace(' - ', '')
          .replaceAll(' - ', ' ')
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
    logger.log(`Running only impacted tests files \n
${chalk.cyan(Array.from(impactedTestFiles).join('\n\n'))}
`);

    return {
      impactedTestFiles,
      impactedTestNames,
    };
  }
}
