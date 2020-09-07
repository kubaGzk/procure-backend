const express = require("express");
const { check } = require("express-validator");

const checkRole = require("../middleware/check-role");
const checkAuth = require("../middleware/check-auth");

const costCentersControllers = require("../controllers/cost-centers-controllers");

const router = express.Router();

router.use(checkAuth);

router.post(
  "/",
  checkRole("createAny", "cost-center"),
  [
    check("owner").not().isEmpty(),
    check("name").isLength({ min: 4, max: 6 }),
    check("budgetLimited").optional().isBoolean(),
  ],
  costCentersControllers.createCostcenter
);

router.patch(
  "/:cid",
  checkRole("updateAny", "cost-center"),
  costCentersControllers.updateCostCenter
);
router.get(
  "/:cid",
  checkRole("readOwn", "cost-center"),
  costCentersControllers.getCostCenter
);

router.get("/", costCentersControllers.getCostCenterList);

module.exports = router;
