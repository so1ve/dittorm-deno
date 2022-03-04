import "https://deno.land/x/xhr@0.1.2/mod.ts";
import { _, AV, leanAdapters } from "../../deps.ts";
import {
  Access,
  ConfigMapping,
  Model,
  SelectOptions,
  Where,
} from "../types.ts";

type WL = Where<"leancloud">;
type CL = ConfigMapping["leancloud"];
type InitFunction = {
  initialized?: boolean;
  (config: CL): void;
};

const init: InitFunction = (config: CL) => {
  if (init.initialized) return;
  init.initialized = true;
  AV.setAdapters(leanAdapters);
  AV.init({
    appId: config.leanAppId,
    appKey: config.leanAppKey,
    masterKey: config.leanMasterKey,
  });
};
export default class LeanCloudModel extends Model {
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

  private parseWhere(className: string, where: WL) {
    const instance = new AV.Query(className);
    if (_.isEmpty(where)) {
      return instance;
    }

    if (where.hasOwnProperty(this.#pk)) {
      where[this._pk] = where[this.#pk];
    }
    for (const k in where) {
      if (k === "_complex" || k === this.#pk) {
        continue;
      }

      if (
        _.isString(where[k]) || _.isNumber(where[k]) || _.isBoolean(where[k])
      ) {
        instance.equalTo(k, where[k]);
        continue;
      }

      if (where[k] === undefined) {
        instance.doesNotExist(k);
        continue;
      }

      if (!Array.isArray(where[k]) || !where[k][0]) {
        continue;
      }

      const handler = where[k][0].toUpperCase();
      switch (handler) {
        case "IN":
          instance.containedIn(k, where[k][1]);
          break;
        case "NOT IN":
          instance.notContainedIn(k, where[k][1]);
          break;
        case "LIKE": {
          const first = where[k][1][0];
          const last = where[k][1].slice(-1);
          if (first === "%" && last === "%") {
            instance.contains(k, where[k][1].slice(1, -1));
          } else if (first === "%") {
            instance.endsWith(k, where[k][1].slice(1));
          } else if (last === "%") {
            instance.startsWith(k, where[k][1].slice(0, -1));
          }
          break;
        }
        case "!=":
          instance.notEqualTo(k, where[k][1]);
          break;
        case ">":
          instance.greaterThan(k, where[k][1]);
          break;
      }
    }
    return instance;
  }

  private where(className: string, where: WL) {
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
        [k]: where._complex[k],
      });
      filters.push(filter);
    }

    return AV.Query[where?._complex._logic](...filters);
  }

  private async _select(
    where: WL,
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

  async select<T = any>(
    where: WL,
    options: SelectOptions = {},
  ): Promise<T> {
    let data: any = [];
    let ret = [];
    let offset = options.offset || 0;
    do {
      options.offset = offset + data.length;
      ret = await this._select(where, options);
      data = data.concat(ret);
    } while (ret.length === 100);

    return data.map((item: any) => {
      item[this.#pk] = item[this._pk].toString();
      delete item[this._pk];
      return item;
    }) as unknown as T;
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

  async update<T, R = any>(
    data: T,
    where: WL,
  ): Promise<R> {
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
    ) as unknown as R;
  }

  async delete<R = any>(where: WL): Promise<R> {
    const instance = this.where(this.tableName, where);
    const data = await instance.find();

    return AV.Object.destroyAll(data as AV.Object[]) as unknown as R;
  }
}
