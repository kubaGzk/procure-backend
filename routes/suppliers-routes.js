const express = require("express");
const { check } = require("express-validator");

const checkAuth = require("../middleware/check-auth");
const checkRole = require("../middleware/check-role");

const suppliersControllers = require("../controllers/suppliers-controllers");

const router = express.Router();

router.use(checkAuth);

router.post(
  "/",
  checkRole("createAny", "supplier"),
  [
    check("name").isLength({ min: 3, max: 64 }),
    check("address.country").isLength({ min: 2, max: 32 }),
    check("address.postalCode").isLength({ max: 8 }).not().isEmpty(),
    check("address.city").isLength({ min: 1, max: 32 }),
    check("address.street").isLength({ min: 3, max: 32 }),
    check("address.houseNumber").isLength({ min: 1, max: 6 }),
    check("contact.email").normalizeEmail().isEmail(),
    check("contact.phone").optional().isLength({ max: 20 }),
  ],

  suppliersControllers.createSupplier
);
router.get(
  "/",
  checkRole("readAny", "supplier"),
  suppliersControllers.getSuppliers
);

router.get(
  "/active",
  checkRole("readAny", "supplier"),
  suppliersControllers.getActiveSuppliers
);

router.patch(
  "/:sid",
  checkRole("updateAny", "supplier"),
  [
    check("name").optional().isLength({ min: 3, max: 64 }),
    check("address.country").optional().isLength({ min: 3, max: 32 }),
    check("address.postalCode").optional().isLength({ min: 3, max: 8 }),
    check("address.city").optional().isLength({ min: 3, max: 32 }),
    check("address.street").optional().isLength({ min: 3, max: 32 }),
    check("address.houseNumber").optional().isLength({ min: 1, max: 6 }),
    check("contact.email").optional().normalizeEmail().isEmail(),
    check("contact.phone").optional().isLength({ max: 20 }),
  ],
  suppliersControllers.patchSupplier
);

module.exports = router;
