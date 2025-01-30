import chalk from 'chalk';

const SIGNATURE = '[PlaywrighRelatedTests]';

class ConsoleLogger {
  private static instance: ConsoleLogger;
  private constructor() {
    if (ConsoleLogger.instance) {
      return ConsoleLogger.instance;
    }
    ConsoleLogger.instance = this;
  }
  static getInstance() {
    return ConsoleLogger.instance || new ConsoleLogger();
  }
  log(message?: any, ...optionalParams: any[]): void {
    console.log(`${chalk.cyan(SIGNATURE)}: ${message} ${optionalParams}`);
  }
  warn(message?: any, ...optionalParams: any[]): void {
    console.log(`${chalk.yellow(SIGNATURE)}: ${message} ${optionalParams}`);
  }
  error(message?: any, ...optionalParams: any[]): void {
    console.error(`${chalk.red(SIGNATURE)}: ${message} ${optionalParams}`);
  }
  debug(message?: any, ...optionalParams: any[]): void {
    // this should be hidden if no DEBUG value is set.
    console.debug(`${chalk.blue(SIGNATURE)}: ${message} ${optionalParams}`);
  }
}

export const logger = ConsoleLogger.getInstance();
