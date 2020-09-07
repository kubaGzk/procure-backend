const AccessControl = require("accesscontrol");

const ac = new AccessControl();

exports.roles = (() => {
  ac.grant("basic")
    .readOwn("task")
    .updateOwn("task")
    .readAny("catalog")
    .readOwn("cost-center")
    .readOwn("user")
    .readOwn("request");

  ac.grant("contract")
    .extend("basic")
    .createOwn("contract")
    .readOwn("contract")
    .updateOwn("contract")
    .deleteOwn("contract");

  ac.grant("request")
    .extend("basic")
    .createOwn("request")
    .readOwn("request")
    .updateOwn("request")
    .deleteOwn("request")
    .createOwn("order")
    .readOwn("order")
    .updateOwn("order")
    .deleteOwn("order");

  ac.grant("report")
    .extend("basic")
    .createOwn("report")
    .readOwn("report")
    .updateOwn("report")
    .deleteOwn("report")
    .readAny("request")
    .readAny("contract")
    .readAny("user");

  ac.grant("admin")
    .extend("basic")
    .createAny("contract")
    .readAny("contract")
    .updateAny("contract")
    .deleteAny("contract")
    .createAny("request")
    .readAny("request")
    .updateAny("request")
    .deleteAny("request")
    .createAny("report")
    .readAny("report")
    .updateAny("report")
    .deleteAny("report")
    .createAny("user")
    .readAny("user")
    .updateAny("user")
    .deleteAny("user")
    .createAny("supplier")
    .readAny("supplier")
    .updateAny("supplier")
    .deleteAny("supplier")
    .createAny("catalog")
    .readAny("catalog")
    .updateAny("catalog")
    .deleteAny("catalog")
    .createAny("cost-center")
    .readAny("cost-center")
    .updateAny("cost-center")
    .deleteAny("cost-center")
    .createAny("order")
    .readAny("order")
    .updateAny("order")
    .deleteAny("order");

  return ac;
})();
