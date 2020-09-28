const express = require("express");
const { check } = require("express-validator");

const checkRole = require("../middleware/check-role");
const checkAuth = require("../middleware/check-auth");
const fileUpload = require("../middleware/file-upload");

const catalogsControllers = require("../controllers/catalogs-controllers");

const router = express.Router();

router.use(checkAuth);

router.post(
  "/",
  fileUpload.fields([
    { name: "catalog", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  checkRole("createAny", "catalog"),
  [
    check("supplier").not().isEmpty(),
    check("name").isLength({ min: 3, max: 32 }),
  ],

  catalogsControllers.createCatalog
);
router.delete(
  "/:cid",
  checkRole("deleteAny", "catalog"),
  catalogsControllers.deleteCatalog
);

router.patch(
  "/:cid",
  fileUpload.fields([
    { name: "catalog", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  checkRole("updateAny", "catalog"),
  catalogsControllers.updateCatalog
);
router.post(
  "/get",
  checkRole("readAny", "catalog"),
  [
    check("itemsPerPage").not().isEmpty(),
    check("currentPage").not().isEmpty(),
    check("sortType").not().isEmpty(),
  ],
  catalogsControllers.getCatalogs
);

router.get("/filters", catalogsControllers.getFilters);

router.get(
  "/list",
  checkRole("readAny", "catalog"),
  catalogsControllers.getCatalogsList
);

router.get(
  "/:cid",
  checkRole("readAny", "catalog"),
  catalogsControllers.getCatalog
);

router.post(
  "/item",
  fileUpload.fields([{ name: "image", maxCount: 1 }]),
  checkRole("createAny", "catalog"),
  [
    check("catalog").not().isEmpty(),
    check("category").not().isEmpty(),
    check("name").not().isEmpty(),
    check("description").not().isEmpty(),
    check("price").not().isEmpty(),
  ],
  catalogsControllers.createItem
);
router.delete(
  "/item/:iid",
  checkRole("deleteAny", "catalog"),
  catalogsControllers.deleteItem
);
router.patch(
  "/item/:iid",
  fileUpload.fields([{ name: "image", maxCount: 1 }]),
  checkRole("updateAny", "catalog"),
  catalogsControllers.updateItem
);
router.get(
  "/item/:iid",
  checkRole("readAny", "catalog"),
  catalogsControllers.getItem
);

module.exports = router;
