import storages from "./storage/mod.ts";

export type SupportedStorages = keyof typeof storages;
export type WhereValue<T = any> =
  | T
  | ["IN" | "NOT IN", T[]]
  | ["LIKE", string]
  | ["!=" | ">", T];
export type Complex<L = "common"> = {
  [key: string]: WhereValue | string;
  _logic: L extends "leancloud" ? "or" | "and" : "or" | "and" | "not" | "nor";
};
export type Where<L = "common"> = {
  [key: string]: WhereValue | Complex<L> | undefined;
  _complex?: Complex<L>;
};
export type SelectOptions = {
  limit?: number;
  offset?: number;
  desc?: string;
  fields?: string[];
};
export type Access = {
  read: boolean;
  write: boolean;
};
export type Config = {
  primaryKey?: string;
  [key: string]: unknown;
};
export type ConfigMapping = {
  leancloud: {
    leanAppId: string;
    leanAppKey: string;
    leanMasterKey: string;
  } & Config;
};
type W = Where<"leancloud"> | Where<"common">;
export abstract class Model<T extends Config = Config> {
  protected tableName: string;
  protected config: T;
  constructor(tableName: string, config: T) {
    this.tableName = tableName;
    this.config = config;
  }
  // deno-lint-ignore no-explicit-any
  abstract select<T = any>(
    where?: W,
    options?: SelectOptions,
  ): Promise<T>;
  // 我不理解源代码里面options是什么
  // deno-lint-ignore no-explicit-any
  abstract count(where?: W, options?: any): Promise<number>;
  // deno-lint-ignore no-explicit-any
  abstract add<T, R = any>(
    data: T,
    access?: Access,
  ): Promise<R>;
  // deno-lint-ignore no-explicit-any
  abstract update<T, R = any>(
    data: T,
    where: W,
  ): Promise<R>;
  // deno-lint-ignore no-explicit-any
  abstract delete<R = any>(where: W): Promise<R>;
}
