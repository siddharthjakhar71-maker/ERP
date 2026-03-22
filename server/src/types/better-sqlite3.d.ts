declare module 'better-sqlite3' {
  interface Statement {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  }

  export default class Database {
    constructor(filename: string);
    pragma(value: string): void;
    exec(sql: string): void;
    prepare(sql: string): Statement;
  }
}
