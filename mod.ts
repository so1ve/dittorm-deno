import storages from "./src/storage/mod.ts";
import { ConfigMapping, SupportedStorages } from "./src/types.ts";

const dittorm = (type: SupportedStorages) => {
  if (!type) {
    throw Error("type is required!");
  }

  if (!storages[type]) {
    throw Error(`${type} service not supports yet!`);
  }

  return (tableName: string, config: ConfigMapping[typeof type]) => {
    config.primaryKey = config.primaryKey || "id";
    return new storages[type](tableName, config);
  };
};

export default dittorm;
export { dittorm };
export * from "./src/types.ts";
