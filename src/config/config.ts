import fs from 'node:fs';
import path from 'node:path';

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

const FILENAME = '.prt-config.json';

function getConfigFile() {
  return path.join(process.cwd(), FILENAME);
}

const CONFIG_FILE = getConfigFile();
const DEFAULT_CONFIG: Config = {
  url: '',
  exitProcess: true,
  affectedIgnorePatterns: [],
};

export default class RelatedTestsConfig {
  static #instance: RelatedTestsConfig;
  private config: Config = DEFAULT_CONFIG;
  private loaded: boolean;

  private constructor() {
    this.config = this.loadFromDisk();
    this.loaded = true;
  }

  public static get instance(): RelatedTestsConfig {
    if (!RelatedTestsConfig.#instance) {
      RelatedTestsConfig.#instance = new RelatedTestsConfig();
    }

    return RelatedTestsConfig.#instance;
  }

  public static init(config: Config): RelatedTestsConfig {
    RelatedTestsConfig.instance.config = Object.assign(DEFAULT_CONFIG, config);

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
}
