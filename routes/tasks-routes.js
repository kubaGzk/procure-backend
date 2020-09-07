const express = require("express");

const checkRole = require("../middleware/check-role");
const checkAuth = require("../middleware/check-auth");

const tasksControllers = require("../controllers/tasks-controllers");

const router = express.Router();

router.use(checkAuth);

router.patch(
  "/approve/:tid",
  checkRole("updateOwn", "task"),
  tasksControllers.approveTask
);
router.patch(
  "/decline/:tid",
  checkRole("updateOwn", "task"),
  tasksControllers.declineTask
);

module.exports = router;
