# dittorm-deno

A Deno ORM for MySQL, SQLite, PostgreSQL, MongoDB, GitHub and serverless
service like Deta, InspireCloud, CloudBase, LeanCloud. Ported from [walinejs/dittorm](https://github.com/walinejs/dittorm)

> **WARNING**: Currently, only leancloud storage is supported.

## Quick Start

```ts
import dittorm from "https://denopkg.com/so1ve/dittorm-deno/mod.ts";

const userModel = dittorm("leancloud")("user", {
  appId: "xxx",
  appKey: "xxx",
  masterKey: "xxx",
});
const user = await userModel.add({
  username: "lizheming",
  email: "i@imnerd.org",
});
const findUser = await user.select({ email: "i@imnerd.org" });
```

## Documentation

### Configuration

#### LeanCloud

```ts
import dittorm from "https://denopkg.com/so1ve/dittorm-deno/mod.ts";

const userModel = dittorm("leancloud")("user", {
  appId: "xxx",
  appKey: "xxx",
  masterKey: "xxx",
});
```

| Name        | Required | Default | Description |
| ----------- | -------- | ------- | ----------- |
| `appId`     | ✅        |         |             |
| `appKey`    | ✅        |         |             |
| `masterKey` | ✅        |         |             |

TODO

### API

#### add(data)

Save store data.

```ts
const data = await userModel.add({
  username: "lizheming",
  email: "i@imnerd.org",
});
console.log(data.id);
```

#### select(where, options)

Find store data by condition.

```js
// SELECT * FROM user WHERE username = 'lizheming';
const data = await userModel.select({ username: "lizheming" });

// SELECT email FROM user WHERE username = 'lizheming' ORDER BY email DESC LIMIT 1 OFFSET 1;
const data = await userModel.select({ username: "lizheming" }, {
  field: ["email"],
  desc: "email",
  limit: 1,
  offset: 1,
});

// SELECT * FROM user WHERE username != 'lizheming';
const data = await userModel.select({ username: ["!=", "lizheming"] });

// SELECT * FROM user WHERE create_time > '2022-01-01 00:00:00';
const data = await userModel.select({ username: [">", "2022-01-01 00:00:00"] });

// SELECT * FROM user WHERE username IN ('lizheming', 'michael');
const data = await userModel.select({
  username: ["IN", ["lizheming", "michael"]],
});

// SELECT * FROM user WHERE username NOT IN ('lizheming', 'michael');
const data = await userModel.select({
  username: ["NOT IN", ["lizheming", "michael"]],
});

// SELECT * FROM user WHERE username LIKE '%li%';
const data = await userModel.select({ username: ["LIKE", "%li%"] });

// SELECT * FROM user WHERE username = 'lizheming' AND create_time > '2022-01-01 00:00:00';
const data = await userModel.select({
  username: "lizheming",
  create_time: [">", "2022-01-01 00:00:00"],
});

// SELECT * FROM user WHERE username = 'lizheming' OR create_time > '2022-01-01 00:00:00';
const data = await userModel.select({
  _complex: {
    username: "lizheming",
    create_time: [">", "2022-01-01 00:00:00"],
    _logic: "or",
  },
});
```

#### update(data, where)

Update store data by condition. `where` format same as `select(where, options)`.

#### count(where)

Return store data count by condition. `where` format same as
`select(where, options)`.

#### delete(where)

Clean store data by condition. `where` format same as `select(where, options)`.

### Types

See [Here](./src/types.ts).