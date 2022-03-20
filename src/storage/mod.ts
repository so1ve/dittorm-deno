import deta from "./deta.ts";
import leancloud from "./leancloud.ts";

export default {
  deta,
  leancloud,
};
export type StoragesConstructed = {
  deta: deta;
  leancloud: leancloud;
};
