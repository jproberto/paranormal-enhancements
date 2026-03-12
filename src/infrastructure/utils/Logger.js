const MODULE_ID = "paranormal-enhancements";

export class Logger {
  static log(...args) {
    console.log(`${MODULE_ID} |`, ...args);
  }

  static warn(...args) {
    console.warn(`${MODULE_ID} |`, ...args);
  }

  static error(...args) {
    console.error(`${MODULE_ID} |`, ...args);
  }
}
