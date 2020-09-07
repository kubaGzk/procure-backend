const express = require("express");
const { check } = require("express-validator");

const checkRole = require("../middleware/check-role");
const checkAuth = require("../middleware/check-auth");

const requestsControllers = require("../controllers/requests-controllers");

const router = express.Router();

router.use(checkAuth);

router.post(
  "/",
  checkRole("createOwn", "request"),
  [check("items").isArray()],
  requestsControllers.createRequest
);
router.patch(
  "/edit/:rid",
  checkRole("updateOwn", "request"),
  [
    check("title").optional().isLength({ min: 3, max: 60 }),
    check("description").optional().isLength({ max: 300 }),
    check("items").isArray(),
    check("address.country").optional().isLength({ min: 3, max: 32 }),
    check("address.postalCode").optional().isLength({ max: 8 }),
    check("address.city").optional().isLength({ min: 1, max: 32 }),
    check("address.street").optional().isLength({ min: 3, max: 32 }),
    check("address.houseNumber").optional().isLength({ min: 1, max: 6 }),
  ],
  requestsControllers.editRequest
);
router.patch(
  "/submit/:rid",
  checkRole("updateOwn", "request"),
  [
    check("title").isLength({ min: 3, max: 60 }),
    check("description").isLength({ max: 300 }),
    check("items").isArray(),
    check("costCenter").not().isEmpty(),
    check("address.country").isLength({ min: 2, max: 32 }),
    check("address.postalCode").isLength({ max: 8 }).not().isEmpty(),
    check("address.city").isLength({ min: 1, max: 32 }),
    check("address.street").isLength({ min: 3, max: 32 }),
    check("address.houseNumber").isLength({ min: 1, max: 6 }),
  ],
  requestsControllers.submitRequest
);
router.patch(
  "/withdraw/:rid",
  checkRole("updateOwn", "request"),
  requestsControllers.withdrawRequest
);
router.delete("/:rid",checkRole("deleteOwn", "request") ,requestsControllers.deleteRequest);
router.get("/:rid",checkRole("readOwn", "request"), requestsControllers.getRequest);
router.post("/requests",checkRole("readOwn", "request") , requestsControllers.getRequests);

module.exports = router;
