const express = require("express");

const checkRole = require("../middleware/check-role");
const checkAuth = require("../middleware/check-auth");

const ordersControllers = require("../controllers/orders-controllers");

const router = express.Router();

router.use(checkAuth);

router.get(
  "/:oid",
  checkRole("readOwn", "order"),
  ordersControllers.getOrderPdf
);
router.get(
  "/request/:rid",
  checkRole("readOwn", "order"),
  ordersControllers.getOrdersPdf
);

router.patch(
  "/sent/:oid",
  checkRole("updateOwn", "order"),
  ordersControllers.markSent
);

module.exports = router;
