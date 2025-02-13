import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_FOLDER } from '../constants';

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
  /**
   * Headers to add to the request when fetching source maps (if your sourcemaps are not public, you might need to access them using some type of authentication).
   * This will use a key to access `process.env`, so don't put the value directly in the config, but the key to access the environment variable.
   *
   * E.g.
   *
   * sourceMapHeaders: {
   *   Authorization: 'process.env.MY_TOKEN'
   * }
   *
   * or
   *
   * sourceMapHeaders: {
   *   Authorization: 'MY_TOKEN'
   * }
   *
   * This way we avoid writing any sensitive information in the config file.
   */
  sourceMapHeaders?: Record<string, string>;
}

const FILENAME = '.prt-config.json';

function getConfigFile() {
  return path.join(CONFIG_FOLDER, FILENAME);
}

const CONFIG_FILE = getConfigFile();
const DEFAULT_CONFIG: Config = {
  url: '',
  exitProcess: true,
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
    if (!fs.existsSync(CONFIG_FOLDER)) {
      fs.mkdirSync(CONFIG_FOLDER, { recursive: true });
    }
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
