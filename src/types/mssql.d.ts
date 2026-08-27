// Minimal ambient declarations for the "mssql" package, which ships without
// types (@types/mssql is not installed). Covers only the surface used by
// src/app/api/profitability/route.ts — replace by installing @types/mssql.
declare module "mssql" {
  export interface SqlConfig {
    server: string;
    database: string;
    user: string;
    password: string;
    port?: number;
    options?: {
      encrypt?: boolean;
      trustServerCertificate?: boolean;
    };
  }

  export interface QueryResult<T = Record<string, unknown>> {
    recordset: T[];
  }

  export class Request {
    input(name: string, value: unknown): Request;
    query<T = Record<string, unknown>>(command: string): Promise<QueryResult<T>>;
  }

  export class ConnectionPool {
    constructor(config: SqlConfig);
    connected: boolean;
    connect(): Promise<ConnectionPool>;
    request(): Request;
    close(): Promise<void>;
  }
}
