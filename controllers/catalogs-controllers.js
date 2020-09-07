const { validationResult } = require("express-validator");
const fs = require("fs");
const csvParser = require("csv-parser");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const Supplier = require("../models/supplier");
// const Contract = require("../models/contract")
const Catalog = require("../models/catalog");
const CatalogItem = require("../models/catalog-item");
const Category = require("../models/category");

//CREATE
const createCatalog = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { supplier: supId, name: name, contract: conId } = req.body;

  //Contract to be implemented
  //   let contract;
  //   if (conId) {
  //     try {
  //       contract = Contract.findById(conId);
  //     } catch (err) {
  //       return next(
  //         new HttpError("Could not perform this action, try again later.", 500)
  //       );
  //     }

  //     if(!contract){
  //         return next("Could not find contract for provided ID.", 404);
  //     }

  //   }

  const mapList = () => {
    return new Promise((resolve, reject) => {
      let items = [];

      fs.createReadStream(req.files["catalog"][0].path)
        .pipe(csvParser())
        .on("error", (err) => {
          reject(new Error("Cannot parse data, try again later."));
        })
        .on("data", (row) => {
          if (
            !row.hasOwnProperty("name") ||
            !row.hasOwnProperty("description") ||
            !row.hasOwnProperty("price") ||
            !row.hasOwnProperty("category")
          ) {
            reject(
              new Error("Header missing or empty row provided in the file.")
            );
          }
          items.push(row);
        })
        .on("end", () => {
          resolve(items);
        });
    });
  };

  let catItems;
  try {
    catItems = await mapList();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!catItems || catItems.length === 0) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  //Setting up image
  let imageUrl = `uploads\\images\\default_catalog_image.png`;

  if (req.files["image"]) {
    imageUrl = req.files["image"][0].path;
  }

  let newCatalog;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    //Find supplier
    let supplier = await Supplier.findOne({ _id: supId, active: true }).exec();
    if (!supplier) {
      throw new Error("Could not find supplier or supplier is inactive.");
    }

    //Create new catalog
    newCatalog = new Catalog({ name, supplier: supId, active: true });
    await newCatalog.save({ session: sess });

    //Save catalog on supplier
    supplier.catalogs.push(newCatalog.id);
    await supplier.save({ session: sess });

    //Setting up image, catalog id and category for each item
    for (let itemKey in catItems) {
      catItems[itemKey].image = imageUrl;
      catItems[itemKey].catalog = newCatalog.id;

      const searchedCat = await Category.findOne({
        name: catItems[itemKey].category,
      }).exec();
      if (!searchedCat) throw new Error("Could not find category.");

      catItems[itemKey].category = searchedCat.id;
      catItems[itemKey].supplier = supId;
    }

    const returnedItems = await CatalogItem.insertMany(catItems, {
      session: sess,
    });

    //Saving items in Catalog
    const itemIds = returnedItems.map((item) => item.id);
    newCatalog.items = itemIds;
    await newCatalog.save({ session: sess });

    //Saving items in Category
    for (let item of returnedItems) {
      const cat = await Category.findById(item.category, null, {
        session: sess,
      }).exec();

      if (!cat) throw new Error();
      cat.items.push(item.id);
      await cat.save({ session: sess });
    }

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  //Remove file after catalogue upload
  fs.unlink(req.files["catalog"][0].path, (err) => {
    err && console.log(err);
  });

  res
    .json({
      message: "Catalog has been created.",
      catalog: newCatalog.toObject({ getters: true }),
    })
    .status(201);
};

//UPDATE
const updateCatalog = async (req, res, next) => {
  const catalogId = req.params.cid;

  let updatedCatalog;
  try {
    updatedCatalog = await Catalog.findById(catalogId).exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later.`,
        500
      )
    );
  }

  if (!updatedCatalog) {
    return next(new HttpError("Could not find catalog for provided ID."));
  }

  //Contract to be implemented
  //   let contract;
  //   if (conId) {
  //     try {
  //       contract = Contract.findById(conId).exec();
  //     } catch (err) {
  //       return next(
  //         new HttpError("Could not perform this action, try again later.", 500)
  //       );
  //     }

  //     if(!contract){
  //         return next("Could not find contract for provided ID.", 404);
  //     }

  //   }

  //Function to map the file
  const mapList = () => {
    return new Promise((resolve, reject) => {
      let items = [];

      fs.createReadStream(req.files["catalog"][0].path)
        .pipe(csvParser())
        .on("error", (err) => {
          reject(new Error("Cannot parse data, try again later."));
        })
        .on("data", (row) => {
          if (
            !row.hasOwnProperty("name") ||
            !row.hasOwnProperty("description") ||
            !row.hasOwnProperty("price") ||
            !row.hasOwnProperty("category")
          ) {
            reject(
              new Error("Header missing or empty row provided in the file.")
            );
          }
          items.push(row);
        })
        .on("end", () => {
          resolve(items);
        });
    });
  };

  //Mapping catalog items
  let catItems;
  try {
    catItems = await mapList();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!catItems || catItems.length === 0) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  //Setting up image
  let imageUrl = `uploads\\images\\default_catalog_image.png`;

  if (req.files["image"]) {
    imageUrl = req.files["image"][0].path;
  }

  let deletedImages = [];

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    //Setting up image, catalog id and category for each item
    for (let itemKey in catItems) {
      catItems[itemKey].image = imageUrl;
      catItems[itemKey].catalog = updatedCatalog.id;

      const searchedCat = await Category.findOne({
        name: catItems[itemKey].category,
      }).exec();
      if (!searchedCat) throw new Error("Could not find category.");

      catItems[itemKey].category = searchedCat.id;
      catItems[itemKey].supplier = updatedCatalog.supplier;
    }

    for (let id of updatedCatalog.items) {
      const item = await CatalogItem.findById(id).populate("category").exec();

      if (!item) throw new Error("Could not find catalog item.");

      item.category.items.pull(id);

      await item.category.save({ session: sess });

      if (deletedImages.indexOf(item.image) === -1)
        deletedImages.push(item.image);

      await item.remove({ session: sess });
    }

    const returnedItems = await CatalogItem.insertMany(catItems, {
      session: sess,
    });

    //Saving items in Catalog
    const itemIds = returnedItems.map((item) => item.id);
    updatedCatalog.items = itemIds;
    await updatedCatalog.save({ session: sess });

    //Saving items in Category
    for (let item of returnedItems) {
      const cat = await Category.findById(item.category, null, {
        session: sess,
      }).exec();

      if (!cat) throw new Error();
      cat.items.push(item.id);
      await cat.save({ session: sess });
    }

    await updatedCatalog.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  //Remove file after catalogue upload
  fs.unlink(req.files["catalog"][0].path, (err) => {
    err && console.log(err);
  });

  //remove
  for (let url of deletedImages) {
    if (url !== "uploads\\images\\default_catalog_image.png")
      fs.unlink(url, (err) => err && console.log(err));
  }

  res.json({
    message: "Catalog has been updated.",
    catalog: updatedCatalog.toObject({ getters: true }),
  });
};

//DELETE
const deleteCatalog = async (req, res, next) => {
  const catalogId = req.params.cid;
  let deletedImages = [];
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    const deletedCatalog = await Catalog.findById(catalogId, "-__v")
      .populate("supplier")
      .exec();
    if (!deletedCatalog) throw new Error("Could not find catalog.");

    console.log(deletedCatalog)

    deletedCatalog.supplier.catalogs.pull(catalogId);
    await deletedCatalog.supplier.save({ session: sess });

    for (let id of deletedCatalog.items) {
      const item = await CatalogItem.findById(id).populate("category").exec();
      if (!item) throw new Error("Could not find catalog item.");
      item.category.items.pull(item.id);
      await item.category.save({ session: sess });

      if (!deletedImages.some((el) => el === item.image))
        deletedImages.push(item.image);

      await item.remove({ session: sess });
    }

    await deletedCatalog.remove({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  for (let url of deletedImages) {
    if (url !== "uploads\\images\\default_catalog_image.png")
      fs.unlink(url, (err) => err && console.log(err));
  }

  res.json({ message: `Deletion of catalog ${catalogId} was succesfull.` });
};

const getCatalogs = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const {
    itemsPerPage,
    sortType,
    currentPage: page,
    filters: queryFilters,
  } = req.body;

  let category, supplier, price;

  if (queryFilters !== "") {
    const parsedFilters = JSON.parse(queryFilters);
    category = parsedFilters.category;
    supplier = parsedFilters.supplier;
    price = parsedFilters.priceRange;
  }

  let returnedItems;
  let itemCount = 0;

  let filters = {};
  if (category && category.length !== 0) filters.category = { $in: category };
  if (supplier && supplier.length !== 0) filters.supplier = { $in: supplier };
  if (price) filters.price = { $gte: price.min, $lte: price.max };


  try {
    //Get catalog items
    const catalogItemsData = await CatalogItem.find(filters, "-__v")
      .populate("category", "-items -__v")
      .populate("supplier", "id supplierId name")
      .populate("catalog", "id active name")
      .exec();

    //Convert catalog items to Obj, add extra props, sort and filter;
    returnedItems = catalogItemsData
      .filter((item) => item.catalog.active)
      .map((item) => {
        itemCount++;
        return item.toObject({ getters: true });
      })
      .sort((a, b) => {
        switch (sortType) {
          case "alphabeticAZ":
            return a.name > b.name ? 1 : -1;

          case "alphabeticZA":
            return a.name > b.name ? -1 : 1;

          case "priceAscending":
            return a.price > b.price ? 1 : -1;

          case "priceDescending":
            return a.price > b.price ? -1 : 1;

          default:
            throw new Error("Could not find specified sort type.");
        }
      })
      .filter(
        (item, ind) =>
          ind >= (page - 1) * itemsPerPage && ind < page * itemsPerPage
      );
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  res.json({
    items: returnedItems,
    numberPages: Math.ceil(itemCount / itemsPerPage),
  });
};

const getCatalog = async (req, res, next) => {
  const catalogId = req.params.cid;

  let catalog;
  try {
    catalog = await Catalog.findById(catalogId)
      .populate("items", "id name description price category")
      .populate("supplier", "name id")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  res.json(catalog.toObject({ getters: true }));
};

const getCatalogsList = async (req, res, next) => {
  let catalogs;
  try {
    catalogs = await Catalog.find()
      .populate("items", "name description id price category")
      .populate("supplier", "name id")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  res.json(catalogs.map((catalog) => catalog.toObject({ getters: true })));
};

const createItem = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { name, description, price, category, catalog } = req.body;

  let updatedCatalog;
  let updatedCategory;
  try {
    updatedCatalog = await Catalog.findById(catalog).exec();
    updatedCategory = await Category.findById(category).exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  if (!updatedCatalog)
    return next(
      new HttpError("Could not find catalogue, please check your data.", 404)
    );

  if (!updatedCategory)
    return next(
      new HttpError("Could not find category, please check your data.", 404)
    );

  const newItem = CatalogItem({
    name,
    description,
    price,
    category,
    image: req.file
      ? req.file.path
      : `uploads\\images\\default_catalog_image.png`,
    catalog,
    supplier: updatedCatalog.supplier,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await newItem.save({ session: sess });

    updatedCatalog.items.push(newItem.id);
    await updatedCatalog.save({ session: sess });

    updatedCategory.items.push(newItem.id);
    await updatedCategory.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  res.json(newItem.toObject({ getters: true }));
};
const updateItem = async (req, res, next) => {
  const itemId = req.params.iid;
  const { name, description, price, category } = req.body;

  let updatedItem;
  let newCategory;
  let oldCategory;

  let oldImage;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    updatedItem = await CatalogItem.findById(itemId).exec();
    if (!updatedItem) throw new Error("Could not find item.");

    if (category) {
      newCategory = await Category.findById(category).exec();
      oldCategory = await Category.findById(updatedItem.category).exec();
      if (!oldCategory || !newCategory)
        throw new Error("Could not find category.");
    }

    updatedItem.name = name || updatedItem.name;
    updatedItem.description = description || updatedItem.description;
    updatedItem.price = price || updatedItem.price;
    updatedItem.category = category || updatedItem.category;

    if (req.file) {
      oldImage = updatedItem.image;
      updatedItem.image = req.file.path;
    }

    await updatedItem.save({ session: sess });

    if (category) {
      newCategory.items.push(updatedItem.id);
      oldCategory.items.pull(updatedItem.id);

      await newCategory.save({ session: sess });
      await oldCategory.save({ session: sess });
    }

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  //REMOVE IMAGE IF REQUIRED
  if (oldImage && oldImage !== "uploads\\images\\default_catalog_image.png") {
    let imgItems;
    try {
      imgItems = await CatalogItem.find({ image: oldImage });
    } catch (err) {
      return next(
        new HttpError(
          `Could not perform this action, please try again later. ${err}`,
          500
        )
      );
    }

    imgItems.length === 0 &&
      fs.unlink(oldImage, (err) => err && console.log(err));
  }

  res.json(updatedItem);
};

const deleteItem = async (req, res, next) => {
  const itemId = req.params.iid;

  let item;
  try {
    item = await CatalogItem.findById(itemId)
      .populate("catalog")
      .populate("category")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  if (!item) {
    return next(
      new HttpError(
        "Could not find specified item, please check your data.",
        404
      )
    );
  }

  let imgUrl = item.image;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    item.category.items.pull(itemId);
    item.catalog.items.pull(itemId);

    await item.category.save({ session: sess });
    await item.catalog.save({ session: sess });

    await item.remove({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  let imgItems;
  try {
    imgItems = await CatalogItem.find({ image: imgUrl });
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  if (
    imgUrl !== "uploads\\images\\default_catalog_image.png" &&
    imgItems.length === 0
  ) {
    fs.unlink(imgUrl, (err) => err && console.log(err));
  }
  res.json({ message: `Deletion of item ${itemId} was succesfull.` });
};

const getItem = async (req, res, next) => {
  const itemId = req.params.iid;

  let item;
  try {
    item = await CatalogItem.findById(itemId)
      .populate("supplier", "name supplierId id")
      .populate("category", "id name")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  if (!item) return next("Could not find contract for provided ID.", 404);

  res.json(item.toObject({ getters: true }));
};

const getFilters = async (req, res, next) => {
  let categoryList;
  let supplierList;

  try {
    categoryList = await Category.find({}, "-items -__v").exec();
    supplierList = await Supplier.find(
      { active: true },
      "name supplierId"
    ).exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please try again later. ${err}`,
        500
      )
    );
  }

  res.json({
    category: categoryList.map((cat) => cat.toObject({ getters: true })),
    supplier: supplierList.map((sup) => sup.toObject({ getters: true })),
  });
};

exports.createCatalog = createCatalog;
exports.updateCatalog = updateCatalog;
exports.deleteCatalog = deleteCatalog;
exports.getCatalogs = getCatalogs;
exports.getCatalog = getCatalog;
exports.getCatalogsList = getCatalogsList;
exports.createItem = createItem;
exports.updateItem = updateItem;
exports.deleteItem = deleteItem;
exports.getItem = getItem;
exports.getFilters = getFilters;
