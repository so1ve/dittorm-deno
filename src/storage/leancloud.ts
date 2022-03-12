import "https://deno.land/x/xhr@0.1.2/mod.ts";
import { _, AV, leanAdapters } from "../../deps.ts";
import {
  Access,
  ConfigMapping,
  Model,
  SelectOptions,
  Where,
} from "../types/mod.ts";

type CL = ConfigMapping["leancloud"];
type InitFunction = {
  initialized?: boolean;
  (config: CL): void;
};

const init: InitFunction = (config: CL) => {
  if (init.initialized) return;
  init.initialized = true;
  AV.setAdapters(leanAdapters);
  AV.init(config);
};
export default class LeanCloudModel<T = any> extends Model<T> {
  #pk: string;
  private static connect(config: CL) {
    init(config);
  }

  constructor(tableName: string, config: CL) {
    super(tableName, config);
    LeanCloudModel.connect(config);
    this.#pk = config.primaryKey || this._pk;
  }

  private get _pk() {
    return "objectId";
  }

  private parseWhere(className: string, where: Where<T>) {
    const instance = new AV.Query(className);
    if (_.isEmpty(where)) {
      return instance;
    }

    if (where.hasOwnProperty(this.#pk)) {
      //@ts-ignore .
      where[this._pk] = where[this.#pk];
    }
    for (const [k, v] of Object.entries(where)) {
      if (k === "_complex" || k === this.#pk) {
        continue;
      }

      if (
        _.isString(v) || _.isNumber(v) || _.isBoolean(v)
      ) {
        instance.equalTo(k, v);
        continue;
      }

      if (v === undefined) {
        instance.doesNotExist(k);
        continue;
      }

      if (!Array.isArray(v) || !v[0]) {
        continue;
      }

      const handler = v[0].toUpperCase();
      switch (handler) {
        case "IN":
          instance.containedIn(k, v[1]);
          break;
        case "NOT IN":
          instance.notContainedIn(k, v[1]);
          break;
        case "LIKE": {
          const first = v[1][0];
          const last = v[1].slice(-1);
          if (first === "%" && last === "%") {
            instance.contains(k, v[1].slice(1, -1));
          } else if (first === "%") {
            instance.endsWith(k, v[1].slice(1));
          } else if (last === "%") {
            instance.startsWith(k, v[1].slice(0, -1));
          }
          break;
        }
        case "!=":
          instance.notEqualTo(k, v[1]);
          break;
        case ">":
          instance.greaterThan(k, v[1]);
          break;
      }
    }
    return instance;
  }

  private where(className: string, where: Where<T>) {
    if (_.isEmpty(where) || !where._complex) {
      return this.parseWhere(className, where);
    }

    const filters = [];
    for (const k in where._complex) {
      if (k === "_logic") {
        continue;
      }

      const filter = this.parseWhere(className, {
        ...where,
        // @ts-ignore .
        [k]: where._complex[k],
      });
      filters.push(filter);
    }

    return AV.Query[where?._complex._logic!](...filters);
  }

  private async _select(
    where: Where<T>,
    { desc, limit, offset, fields }: SelectOptions = {},
  ) {
    const instance = this.where(this.tableName, where);
    if (desc) {
      instance.descending(desc);
    }
    if (limit) {
      instance.limit(limit);
    }
    if (offset) {
      instance.skip(offset);
    }
    if (fields) {
      instance.select(fields);
    }

    const data = await instance.find().catch((e) => {
      if (e.code === 101) {
        return [];
      }
      throw e;
    });
    return data.map((item) => item.toJSON());
  }

  async select(
    where: Where<T>,
    options: SelectOptions = {},
  ): Promise<T[]> {
    let data: any = [];
    let ret = [];
    const offset = options.offset || 0;
    do {
      options.offset = offset + data.length;
      ret = await this._select(where, options);
      data = data.concat(ret);
    } while (ret.length === 100);

    return data.map((item: any) => {
      const pk = item[this._pk].toString();
      delete item[this._pk];
      item[this.#pk] = pk;
      return item;
    }) as unknown as T[];
  }

  async count(where = {}, options = {}) {
    const instance = this.where(this.tableName, where);
    return await instance.count(options).catch((e) => {
      if (e.code === 101) {
        return 0;
      }
      throw e;
    });
  }

  async add<T, R = any>(
    data: T,
    { read, write }: Access = { read: true, write: true },
  ): Promise<R> {
    const Table = AV.Object.extend(this.tableName);
    const instance = new Table();
    instance.set(data);

    const acl = new AV.ACL();
    acl.setPublicReadAccess(read);
    acl.setPublicWriteAccess(write);
    instance.setACL(acl);

    const resp = (await instance.save()).toJSON();
    resp[this.#pk] = resp[this._pk];
    delete resp[this._pk];
    return resp;
  }

  async update(
    data: T,
    where: Where<T>,
  ): Promise<T> {
    const instance = this.where(this.tableName, where);
    const ret = await instance.find();

    return Promise.all(
      ret.map(async (item) => {
        if (typeof data === "function") {
          item.set(data(item.toJSON()));
        } else {
          item.set(data);
        }

        const resp = await item.save();
        return resp.toJSON();
      }),
    ) as unknown as T;
  }

  async delete(where: Where<T>): Promise<void> {
    const instance = this.where(this.tableName, where);
    const data = await instance.find();

    return AV.Object.destroyAll(data as AV.Object[]) as unknown as void;
  }
}
