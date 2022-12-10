// Leancloud Storage
export { default as AV } from "https://esm.sh/leancloud-storage@4.12.0?target=es2021"; // Deno deploy环境下esm.sh会默认把target设置为deno导致报错"TypeError: Can not modify env vars during execution."
export * as leanAdapters from "https://esm.sh/@leancloud/platform-adapters-node@1.5.2?target=es2021";
// Deta
export {
  Base as DetaBase,
  Deta,
} from "https://esm.sh/deta@1.1.0?target=deno";
// Lodash
export * as _ from "https://deno.land/x/lodash@4.17.15-es/lodash.js";
