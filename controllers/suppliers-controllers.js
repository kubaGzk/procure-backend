const { validationResult } = require("express-validator");
const Supplier = require("../models/supplier");
const HttpError = require("../models/http-error");

const createSupplier = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { name, address, contact } = req.body;

  const newSupplier = new Supplier({
    name,
    address,
    contact,
    active: true,
    orders: [],
    contracts: [],
    catalogs: [],
  });

  //Create Object
  try {
    await newSupplier.save();
  } catch (err) {
    return next(
      new HttpError(
        `Supplier creation failed, please try again later. ${err}`,
        500
      )
    );
  }

  //Create custom ID based on index field
  const supId = "S" + newSupplier.ind.toString().padStart(5, 0);
  newSupplier.supplierId = supId;

  try {
    await newSupplier.save();
  } catch (err) {
    return next(
      new HttpError(
        `Supplier creation failed, please try again later. ${err}`,
        500
      )
    );
  }

  const returnedSupplier = { ...newSupplier.toObject({ getters: true }) };
  delete returnedSupplier.catalogs;
  delete returnedSupplier.orders;
  delete returnedSupplier.contracts;

  res.json(returnedSupplier);
};

const getSuppliers = async (req, res, next) => {
  let suppliers;
  try {
    suppliers = await Supplier.find().exec();
  } catch (err) {
    return next(
      new HttpError("Could not perform this action, try again later.", 500)
    );
  }

  res.json(suppliers.map((sup) => sup.toObject({ getters: true })));
};

const getActiveSuppliers = async (req, res, next) => {
  let suppliers;
  try {
    suppliers = await Supplier.find({ active: true }).exec();
  } catch (err) {
    return next(
      new HttpError("Could not perform this action, try again later.", 500)
    );
  }
  res.json(suppliers.map((sup) => sup.toObject({ getters: true })));
};

const patchSupplier = async (req, res, next) => {
  const supplierId = req.params.sid;

  let supplier;

  try {
    supplier = await Supplier.findById(supplierId).exec();
  } catch (err) {
    return next(
      new HttpError("Could not perform this action, try again later.", 500)
    );
  }

  if (!supplier) {
    return next(new HttpError("Could not find supplier.", 404));
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { name, active, address, contact } = req.body;

  console.log(req.body);

  supplier.name = name || supplier.name;
  supplier.active = active === undefined ? supplier.active : active;

  if (address) {
    supplier.address.country = address.country || supplier.address.country;
    supplier.address.postalCode =
      address.postalCode || supplier.address.postalCode;
    supplier.address.city = address.city || supplier.address.city;
    supplier.address.street = address.street || supplier.address.street;
    supplier.address.houseNumber =
      address.houseNumber || supplier.address.houseNumber;
  }

  if (contact) {
    supplier.contact.email = contact.email || supplier.contact.email;
    supplier.contact.phone = contact.phone || supplier.contact.phone;
  }
  try {
    await supplier.save();
  } catch (err) {
    return next(
      new HttpError("Could not perform this action, try again later.", 500)
    );
  }

  res.json(supplier);
};
exports.createSupplier = createSupplier;
exports.getSuppliers = getSuppliers;
exports.getActiveSuppliers = getActiveSuppliers;
exports.patchSupplier = patchSupplier;
