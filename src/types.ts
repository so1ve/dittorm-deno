import storages from "./storage/mod.ts";

export type SupportedStorages = keyof typeof storages;
export type WhereValue<T = any> =
  | T
  | ["IN" | "NOT IN", T[]]
  | ["LIKE", string]
  | ["!=" | ">", T];

type LogicKey = "_logic";
export type Complex<T> = {
  [key in (keyof T | LogicKey)]: key extends LogicKey ? "or" | "and"
    : WhereValue<any> | string;
};

type ComplexKey = "_complex";
export type Where<T> = {
  [key in (keyof T | ComplexKey)]?: key extends ComplexKey ? Complex<T>
    : WhereValue<any> | Complex<T> | undefined;
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
export abstract class Model<T = any, C extends Config = Config> {
  protected tableName: string;
  protected config: C;
  constructor(tableName: string, config: C) {
    this.tableName = tableName;
    this.config = config;
  }
  abstract select(
    where?: Where<T>,
    options?: SelectOptions,
  ): Promise<T[]>;
  // 我不理解源代码里面options是什么
  // deno-lint-ignore no-explicit-any
  abstract count(where?: Where<T>, options?: any): Promise<number>;
  abstract add(
    data: T,
    access?: Access,
  ): Promise<T>;
  abstract update(
    data: T,
    where: Where<T>,
  ): Promise<T>;
  abstract delete(where: Where<T>): Promise<void>;
}
