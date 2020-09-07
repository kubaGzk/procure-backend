const { roles } = require("../models/user-roles");
const HttpError = require("../models/http-error");
const User = require("../models/user");

module.exports = (action, resource) => {
  return async (req, res, next) => {
    //Check requestor
    const { userId } = req.userData;
    let requestor;
    try {
      requestor = await User.findById(userId, '-password -requests -contracts -tasks').exec();
    } catch (err) {
      return next(new HttpError("Action failed, please try again later.", 500));
    }

    if (!requestor) {
      return next(new HttpError("Not authorized, cannot perform action.", 401));
    }

    if (!requestor.active) {
      return next(new HttpError("User account not active, cannot perform action.", 401));
    }

    //Check requestor permission
    let permission;

    try {
      permission = roles.can(requestor.role)[action](resource);
    } catch (err) {
      return next(new HttpError("Action failed, please try again later.", 500));
    }
    if (!permission.granted || !requestor.active) {
      return next(new HttpError("Not authorized, cannot perform action.", 401));
    }

    //Return user with request
    req.user = requestor;
    next();
  };
};
