import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

interface Config {
  url: string;
  exitProcess: boolean;
  affectedIgnorePatterns: string[];
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

export default class RelatedTestsConfig {
  static #instance: RelatedTestsConfig;
  private config = DEFAULT_CONFIG;
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

  public getConfig() {
    return this.config;
  }
}
