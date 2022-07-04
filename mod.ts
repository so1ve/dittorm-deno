import storages, { StoragesConstructed } from "./src/storage/mod.ts";
import { ConfigMapping, SupportedStorages } from "./src/types/mod.ts";

type GetModel<T extends SupportedStorages> = (
  tableName: string,
  config: ConfigMapping[T],
) => StoragesConstructed[T];
function dittorm<T extends SupportedStorages>(_type: T): GetModel<T> {
  if (!_type) {
    throw Error("type is required!");
  }

  const type = _type.toLowerCase() as SupportedStorages;
  const DStorage = storages[type];

  if (!DStorage) {
    throw Error(`${type} service not supports yet!`);
  }

  // deno-lint-ignore no-explicit-any
  const getModel = <U = any>(tableName: string, config: ConfigMapping[T]) => {
    config.primaryKey = config.primaryKey || "id";
    // @ts-ignore Fuck!
    return new DStorage<U>(tableName, config);
  };
  return getModel as GetModel<T>;
}

export default dittorm;
export { dittorm };
export * from "./src/types/mod.ts";
