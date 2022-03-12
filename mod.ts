import storages from "./src/storage/mod.ts";
import { ConfigMapping, SupportedStorages } from "./src/types/mod.ts";

const dittorm = (_type: SupportedStorages) => {
  if (!_type) {
    throw Error("type is required!");
  }

  const type = _type.toLowerCase() as SupportedStorages;
  const storage = storages[type];

  if (!storage) {
    throw Error(`${type} service not supports yet!`);
  }

  return <T = any>(tableName: string, config: ConfigMapping[typeof type]) => {
    config.primaryKey = config.primaryKey || "id";
    // @ts-ignore 我不会TS
    return new storage<T>(tableName, config);
  };
};

export default dittorm;
export { dittorm };
export * from "./src/types/mod.ts";
