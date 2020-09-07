const express = require("express");
const { check } = require("express-validator");

const checkRole = require("../middleware/check-role");
const checkAuth = require("../middleware/check-auth");

const usersControllers = require("../controllers/users-controllers");

const router = express.Router();

router.post(
  "/login",
  [
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6, max: 32 }),
  ],
  usersControllers.login
);

router.use(checkAuth);

router.post(
  "/create",
  checkRole("createAny", "user"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6, max: 32 }),
    check("role").optional().isArray(),
    check("active").optional().isBoolean(),
  ],
  usersControllers.createUser
);

router.get("/", checkRole("readAny", "user"), usersControllers.getUsers);

router.patch(
  "/user",
  checkRole("updateAny", "user"),
  [
    check("id").not().isEmpty(),
    check("email").optional().normalizeEmail().isEmail(),
    check("role").optional().isArray(),
    check("active").optional().isBoolean(),
  ],
  usersControllers.patchUser
);

router.post(
  "/user",
  checkRole("updateAny", "user"),
  [
    check("id").not().isEmpty(),
    check("password").isLength({ min: 6, max: 32 }),
  ],
  usersControllers.resetUser
);

router.get(
  "/dashboard",
  checkRole("readOwn", "user"),
  usersControllers.getDashboard
);

module.exports = router;
