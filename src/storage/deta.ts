import { _, Deta, DetaBase as _DetaBase } from "../../deps.ts";
import {
  Args,
  ConfigMapping,
  Model,
  SelectOptions,
  Where,
} from "../types/mod.ts";

type CD = ConfigMapping["deta"];
type DetaBase = ReturnType<typeof _DetaBase>;
type DetaType = Args<DetaBase["put"]>[0];

export default class DetaModel<T = any> extends Model<T> {
  #pk: string;
  instance: DetaBase;

  static connect({ projectKey }: CD) {
    return Deta(projectKey);
  }

  constructor(tableName: string, config: CD) {
    super(tableName, config);
    const deta = DetaModel.connect(config);
    this.instance = deta.Base(tableName);
    this.#pk = config.primaryKey || this._pk;
  }

  private get _pk() {
    return "key";
  }

  complex(obj: Record<string, unknown>, keys: string[]) {
    const result = new Array(
      keys.reduce((a, b) => a * (obj[b] as unknown[]).length, 1),
    );
    for (let i = 0; i < result.length; i++) {
      result[i] = { ...obj };
      for (let n = 0; n < keys.length; n++) {
        const divisor = keys
          .slice(n + 1)
          .reduce((a, b) => a * (obj[b] as unknown[]).length, 1);
        const idx = Math.floor(i / divisor) %
          (obj[keys[n]] as unknown[]).length;
        result[i][keys[n]] = (obj[keys[n]] as unknown[])[idx];
      }
    }

    return result;
  }

  /**
   * deta base doesn't support order data by field
   * it will order by key default
   * so we need create a lower key than before to keep latest data in front
   * @returns string
   */
  async uuid() {
    const items = await this.select({}, { limit: 1 });
    let lastKey;
    //@ts-ignore
    if (items.length && !isNaN(parseInt(items[0][this.#pk]))) {
      //@ts-ignore
      lastKey = parseInt(items[0][this.#pk]);
    } else {
      lastKey = Number.MAX_SAFE_INTEGER - performance.now();
    }
    return (lastKey - Math.round(Math.random() * 100)).toString();
  }

  where(where: Where<T>) {
    if (_.isEmpty(where)) {
      return;
    }

    const parseKey = (k: string) => (k === this.#pk ? this._pk : k);
    const conditions: Record<string, unknown> = {};
    const _isArrayKeys = [];
    for (const k in where) {
      if (
        _.isString(where[k as keyof T]) ||
        _.isNumber(where[k as keyof T]) ||
        _.isBoolean(where[k as keyof T])
      ) {
        conditions[parseKey(k)] = where[k as keyof T];
        continue;
      }
      if (where[k as keyof T] === undefined) {
        conditions[parseKey(k)] = null;
      }

      if (!Array.isArray(where[k as keyof T]) || !where[k as keyof T][0]) {
        continue;
      }
      const handler = where[k as keyof T][0].toUpperCase();
      const filterValue = where[k as keyof T][1];
      switch (handler) {
        case "IN":
          conditions[parseKey(k)] = filterValue;
          if (Array.isArray(filterValue)) {
            _isArrayKeys.push(parseKey(k));
          }
          break;

        case "NOT IN":
          console.warn(
            `deta base doesn't support not equal with multiple value query`,
          );
          break;

        case "LIKE": {
          const first = filterValue[0];
          const last = filterValue.slice(-1);
          if (first === "%" && last === "%") {
            conditions[parseKey(k) + "?contains"] = filterValue.slice(1, -1);
          } else if (first === "%") {
            conditions[parseKey(k) + "?contains"] = filterValue.slice(1);
          } else if (last === "%") {
            conditions[parseKey(k) + "?pfx"] = filterValue.slice(0, -1);
          }
          break;
        }
        case "!=":
          conditions[parseKey(k) + "?ne"] = filterValue;
          break;
        case ">":
          conditions[parseKey(k) + "?gt"] = filterValue;
          break;
      }
    }

    if (_isArrayKeys.length === 0) {
      return conditions;
    }

    return this.complex(conditions, _isArrayKeys);
  }

  async select(
    where: Where<T>,
    { limit, offset, fields }: SelectOptions = {},
  ): Promise<T[]> {
    const conditions = this.where(where);
    if (conditions && Array.isArray(conditions)) {
      return Promise.all(
        conditions.map((condition) =>
          this.select(condition, { limit, offset, fields })
        ),
      ).then((data) => data.flat());
    }

    let data: T[] = [];
    if (
      conditions &&
      _.isObject(conditions) &&
      _.isString(conditions.key) &&
      conditions.key
    ) {
      /**
       * deta base doesn't support fetch with key field query
       * if you want query by key field
       * you need use `get()` rather than `fetch()` method.
       */
      const item = await this.instance.get(conditions.key as string);
      item && data.push(item as unknown as T);
    } else if (offset) {
      limit = limit || 0;
      /**
       * deta base need last data key when pagination
       * so we need fetch data list again and again
       * because only that we can get last data key
       */
      while (data.length < limit + offset) {
        const lastData = data[data.length - 1];
        const last = lastData ? (lastData as unknown as any).key : undefined;
        const { items } = await this.instance.fetch(
          conditions as unknown as any,
          {
            limit,
            last,
          },
        );
        data = data.concat(items as unknown as T[]);

        if (items.length < limit) {
          break;
        }
      }

      data = data.slice(offset, offset + limit);
    } else {
      const { items } = await this.instance.fetch(
        conditions as unknown as any,
        {
          limit: limit,
        },
      );
      data = (items as unknown as T[]) || [];
    }

    data = data.map((item: any) => {
      const pk = item[this._pk];
      delete item[this._pk];
      item[this.#pk] = pk;
      return item;
    });

    if (Array.isArray(fields)) {
      const fieldMap = new Set(fields);
      fieldMap.add(this.#pk);
      data.forEach((item) => {
        for (const k in item) {
          if (!fieldMap.has(k)) {
            delete item[k];
          }
        }
      });
    }

    return data;
  }

  async count(where = {}): Promise<number> {
    const conditions = this.where(where);
    if (Array.isArray(conditions)) {
      const counts = await Promise.all(
        conditions.map((condition) => this.count(condition)),
      );
      return counts.reduce((a, b) => a + b, 0);
    }

    const { count } = await this.instance.fetch(conditions as unknown as any);
    return count;
  }

  async add(data: Partial<T>): Promise<T> {
    const uuid = await this.uuid();
    const resp = await this.instance.put(data as DetaType, uuid);
    resp![this.#pk] = resp![this._pk];
    delete resp![this._pk];
    return resp as unknown as T;
  }

  async update(
    data: Partial<T> | ((item: T) => T),
    where: Where<T>,
  ): Promise<T> {
    const items = await this.select(where);
    return Promise.all(
      items.map(async (item) => {
        const updateData = typeof data === "function" ? data(item) : data;
        const nextData = { ...item, ...updateData };
        await this.instance.put(nextData as DetaType, (item as any)[this.#pk]);
        return nextData;
      }),
    ) as unknown as T;
  }

  async delete(where: Where<T>) {
    const items = await this.select(where);
    Promise.all(
      items.map((item: any) => this.instance.delete(item[this.#pk])),
    );
  }
}
