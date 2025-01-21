import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import type { BaseConnector } from '../connectors/base';
import type { RelationshipType } from '../types';

/**
 * @expand
 * @interface Config
 * */
export interface Config {
  /**
   * List of patterns to ignore when looking for related tests
   */
  affectedIgnorePatterns?: string[];
  /**
   * The URL where the files are hosted. This can differ from the local to staging or production environment.
   */
  url: string;
  /**
   * Whether to exit the process after running the extension. For example, if no tests are found and exitProcess is true, the process will exit.
   * This is useful for CI/CD pipelines in the pull request stage.
   */
  exitProcess?: boolean;
}

const FILENAME = 'config.json';

function getConfigFile() {
  if (import.meta.url) {
    return path.join(path.dirname(fileURLToPath(import.meta.url)), FILENAME);
  }

  return path.join(__dirname, FILENAME);
}

const CONFIG_FILE = getConfigFile();
const DEFAULT_CONFIG: Config = {
  url: '',
  exitProcess: true,
  affectedIgnorePatterns: [],
};

interface Connectors {
  local: BaseConnector[];
  remote: BaseConnector[];
}

export default class RelatedTestsConfig {
  static #instance: RelatedTestsConfig;
  private config: Config = DEFAULT_CONFIG;
  private connectors: Connectors;
  private loaded: boolean;

  private constructor() {
    this.config = this.loadFromDisk();
    this.connectors = {
      local: [],
      remote: [],
    };
    this.loaded = true;
  }

  public static get instance(): RelatedTestsConfig {
    if (!RelatedTestsConfig.#instance) {
      RelatedTestsConfig.#instance = new RelatedTestsConfig();
    }

    return RelatedTestsConfig.#instance;
  }

  public static init(
    config: Config,
    connectors: Connectors,
  ): RelatedTestsConfig {
    RelatedTestsConfig.instance.config = Object.assign(DEFAULT_CONFIG, config);
    RelatedTestsConfig.instance.connectors = connectors;

    RelatedTestsConfig.#instance.saveToDisk();

    return RelatedTestsConfig.#instance;
  }

  private saveToDisk() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config));
  }

  private loadFromDisk() {
    if (this.loaded) {
      return this.config;
    }

    if (!fs.existsSync(CONFIG_FILE)) {
      return DEFAULT_CONFIG;
    }

    return JSON.parse(fs.readFileSync(CONFIG_FILE).toString());
  }

  public getConfig(): Config {
    return this.config;
  }

  // This should be somewhere else, maybe in the file manager class
  public syncRemote(type: RelationshipType) {
    return Promise.all(
      this.connectors.remote.map((connector) => connector.sync()),
    );
  }
}
