export type Args<Fn> = Fn extends (...args: (infer A)) => unknown ? A
  : never;
