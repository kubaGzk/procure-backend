const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const CatalogItems = require("../models/catalog-item");
const CostCenter = require("../models/cost-center");
const Request = require("../models/request");
const HttpError = require("../models/http-error");
const Task = require("../models/task");
const User = require("../models/user");
const Order = require("../models/order");

//CREATE/////////////////////////////////////
const createRequest = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { items } = req.body;
  const user = req.user;

  let itemsData;
  let itemsQuantity = {};
  let itemsIds = [];
  let foundItems;

  //Getting list of ids and
  for (let item of items) {
    itemsQuantity[item.id] = item.quantity;
    itemsIds.push(item.id);
  }

  try {
    //Searching for Items (if dont exist or inactive they are skipped)
    foundItems = await CatalogItems.find(
      { _id: { $in: itemsIds } },
      "-image -__v"
    )
      .populate("catalog", "name active")
      .populate("supplier", "name supplierId")
      .populate("category", "name")
      .exec();

    foundItems.filter((item) => item.catalog.active);
    itemsData = foundItems.map((item) => {
      return {
        ...item.toObject({ getters: true }),
        quantity: itemsQuantity[item.id],
      };
    });
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  //Check if items exists and if their length is over 0
  if (!itemsData || itemsData.length === 0) {
    return next(
      new HttpError(
        `Invalid items provided. Items has been deleted or catalog is inactive.`,
        422
      )
    );
  }

  //Calculate order value
  const value = +itemsData
    .reduce((acc, el) => {
      return (acc += el.price * el.quantity);
    }, 0)
    .toFixed(2);

  //Missing: task, requestId
  const newRequest = new Request({
    value,
    items: itemsData,
    creationDate: new Date(),
    creator: user.id,
    status: "draft",
    history: [{ type: "create", user: user.id, date: new Date() }],
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await newRequest.save({ session: sess });

    //Create custom ID based on index field
    const reqId = "R" + newRequest.ind.toString().padStart(5, 0);
    newRequest.requestId = reqId;

    await newRequest.save({ session: sess });

    const requestOwner = await User.findById(user.id).exec();
    requestOwner.requests.push(newRequest.id);
    await requestOwner.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  const mess = "Request has been created sucesfully.";
  if (items.length !== newRequest.items.length) {
    mess =
      "Request has been created, but some of the items were skipped due to catalog deactivation.";
  }

  //Due to history required for view, request needs to be obtained from the server again
  let populatedRequest;

  try {
    populatedRequest = await Request.findById(newRequest.id).populate(
      "history.user",
      "name email"
    );
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  res
    .json({
      request: populatedRequest.toObject({ getters: true }),
      message: mess,
    })
    .status(201);
};

//EDIT/SAVE////////////////////////////////////////////////

const editRequest = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { title, description, items, costCenter, address } = req.body;
  const requestId = req.params.rid;

  let updatedRequest;
  try {
    updatedRequest = await Request.findById(requestId)
      .populate({
        path: "costCenter",
        select: "id name owner",
        populate: { path: "owner", select: "name email id" },
      })
      .populate("history.user", "name email")
      .populate("creator")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!updatedRequest) {
    return next(new HttpError(`Could not find request for provided ID.`, 404));
  }

  if (
    updatedRequest.creator.id !== req.user.id &&
    req.user.role.indexOf("admin") === -1
  ) {
    return next(
      new HttpError("You are not authorized to edit this data.", 401)
    );
  }
  if (updatedRequest.status !== "draft") {
    return next(new HttpError("Only draft requests can be edited.", 422));
  }

  let itemsData;
  let itemsQuantity = {};
  let itemsIds = [];
  let foundItems;

  //Getting list of ids and
  for (let item of items) {
    itemsQuantity[item.id] = item.quantity;
    itemsIds.push(item.id);
  }

  //Searching for Items (if dont exist or inactive they are skipped)
  try {
    foundItems = await CatalogItems.find(
      { _id: { $in: itemsIds } },
      "-image -__v"
    )
      .populate("catalog", "name active")
      .populate("supplier", "name supplierId")
      .populate("category", "name")
      .exec();

    foundItems.filter((item) => item.catalog.active);
    itemsData = foundItems.map((item) => {
      return {
        ...item.toObject({ getters: true }),
        quantity: itemsQuantity[item.id],
      };
    });
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  //Check if items exists and if their length is over 0
  if (!itemsData || itemsData.length === 0) {
    return next(
      new HttpError(
        `Invalid items provided. Items has been deleted or catalog is inactive.`,
        422
      )
    );
  }

  //Calculate order value
  const value = +itemsData
    .reduce((acc, el) => {
      return (acc += el.price * el.quantity);
    }, 0)
    .toFixed(2);

  updatedRequest.value = value;
  updatedRequest.items = itemsData;
  updatedRequest.title = title || updatedRequest.title;
  updatedRequest.description = description || updatedRequest.description;
  updatedRequest.costCenter = costCenter || updatedRequest.costCenter;
  updatedRequest.address = address || updatedRequest.address;
  updatedRequest.history.push({
    type: "edit",
    user: req.user.id,
    date: new Date(),
  });

  try {
    await updatedRequest.save();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  const mess = "Request has been updated sucesfully.";
  if (items.length !== updatedRequest.items.length) {
    mess =
      "Request has been updated, but some of the items were skipped due to catalog deactivation.";
  }

  const returnedRequest = updatedRequest.toObject({ getters: true });
  returnedRequest.history[updatedRequest.history.length - 1].user = {
    email: req.user.email,
    id: req.user.id,
    name: req.user.name,
  };

  res.json({
    request: returnedRequest,
    message: mess,
  });
};

//SUBMIT///////////////////////////////////
const submitRequest = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { title, description, items, costCenter, address } = req.body;
  const requestId = req.params.rid;

  let submittedRequest;
  try {
    submittedRequest = await Request.findById(requestId)
      .populate("creator")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!submittedRequest) {
    return next(new HttpError(`Could not find request for provided ID.`, 404));
  }

  if (
    submittedRequest.creator.id !== req.user.id &&
    req.user.role.indexOf("admin") === -1
  ) {
    return next(
      new HttpError("You are not authorized to edit this data.", 401)
    );
  }

  if (submittedRequest.status !== "draft") {
    return next(new HttpError("Only draft request can be submitted.", 422));
  }

  let itemsData;
  let costCenterData;
  let itemsQuantity = {};
  let itemsIds = [];
  let foundItems;

  //Getting list of ids and
  for (let item of items) {
    itemsQuantity[item.id] = item.quantity;
    itemsIds.push(item.id);
  }

  //1. Searching for Items (if dont exist or inactive they are skipped)
  //2. Find cost center

  try {
    //1.
    foundItems = await CatalogItems.find(
      { _id: { $in: itemsIds } },
      "-image -__v"
    )
      .populate("catalog", "name active")
      .populate("supplier", "name supplierId")
      .populate("category", "name")
      .exec();

    foundItems.filter((item) => item.catalog.active);
    itemsData = foundItems.map((item) => {
      return {
        ...item.toObject({ getters: true }),
        quantity: itemsQuantity[item.id],
      };
    });
    //2.
    costCenterData = await CostCenter.findById(costCenter).exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  //Check if items exists and if their length is over 0
  if (!itemsData || itemsData.length === 0) {
    return next(
      new HttpError(
        `Invalid items provided. Items has been deleted or catalog is inactive.`,
        422
      )
    );
  }

  //Check cost center
  if (!costCenterData) {
    return next(new HttpError(`Could not find cost center.`, 404));
  }

  //Check if cc is active
  if (!costCenterData.active) {
    return next(new HttpError(`Provided cost center is inactive.`, 422));
  }

  //Calculate order value
  const value = +itemsData
    .reduce((acc, el) => {
      return (acc += el.price * el.quantity);
    }, 0)
    .toFixed(2);

  //Finding task owner
  let taskOwner;

  try {
    taskOwner = await User.findById(costCenterData.owner).exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!taskOwner || !taskOwner.active) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. Cost center owner inactive.`,
        500
      )
    );
  }

  //Setting up new task
  let newTask = new Task({
    type: "approve",
    owner: taskOwner.id,
    request: submittedRequest.id,
    submitDate: new Date(),
    status: "pending",
  });

  //Setting up order data
  submittedRequest.value = value;
  submittedRequest.items = itemsData;
  submittedRequest.title = title;
  submittedRequest.description = description;
  submittedRequest.costCenter = costCenter;
  submittedRequest.submitDate = new Date();
  submittedRequest.status = "submitted";
  submittedRequest.address = address;
  submittedRequest.history.push({
    type: "submit",
    user: req.user.id,
    date: new Date(),
  });

  //Setting up cost center data

  if (
    costCenterData.budgetLimited &&
    costCenterData.spend + value > costCenterData.budget
  ) {
    return next(new HttpError(`Budget has been exceeded.`, 422));
  }
  costCenterData.spend = costCenterData.spend + value;
  costCenterData.requests.push(submittedRequest.id);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await newTask.save({ session: sess });
    submittedRequest.task = newTask.id;
    taskOwner.tasks.push(newTask.id);

    await submittedRequest.save({ session: sess });
    await costCenterData.save({ session: sess });
    await taskOwner.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }
  res.json({
    request: submittedRequest.toObject({ getters: true }),
    message: "Order has been submitted.",
  });
};

//Withdraw Request////////////////////////////////////////////////
const withdrawRequest = async (req, res, next) => {
  const requestId = req.params.rid;
  let wdRequest;
  try {
    //Get request with task,task owner and cost center data
    wdRequest = await Request.findById(requestId)
      .populate({
        path: "task",
        populate: { path: "owner", select: "tasks id status" },
      })
      .populate("costCenter")
      .populate("creator")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!wdRequest) {
    return next(new HttpError(`Could not find request for provided ID.`, 404));
  }

  if (
    wdRequest.creator.id !== req.user.id &&
    req.user.role.indexOf("admin") === -1
  ) {
    return next(
      new HttpError("You are not authorized to edit this data.", 401)
    );
  }

  if (wdRequest.status === "draft") {
    return next(new HttpError("Draft request cannot be withdrawn.", 422));
  }

  if (wdRequest.status === "approved") {
    return next(new HttpError("Approved request cannot be withdrawn.", 422));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    //Clear order from cost center
    wdRequest.costCenter.spend = wdRequest.costCenter.spend - wdRequest.value;
    wdRequest.costCenter.requests.pull(wdRequest.id);
    await wdRequest.costCenter.save({ session: sess });

    //Clear task from the user
    wdRequest.task.owner.tasks.pull(wdRequest.task);
    await wdRequest.task.owner.save({ session: sess });

    //Delete task
    if (
      wdRequest.task.status !== "approved" &&
      wdRequest.task.status !== "declined"
    ) {
      await wdRequest.task.remove({ session: sess });
    }

    //Update request
    wdRequest.status = "draft";
    wdRequest.submitDate = null;
    wdRequest.history.push({
      type: "withdraw",
      user: req.user.id,
      date: new Date(),
    });
    wdRequest.task = null;

    await wdRequest.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  res.json({ message: "Withdraw succesfull.", data: wdRequest });
};

const deleteRequest = async (req, res, next) => {
  const requestId = req.params.rid;
  let deletedRequest;
  try {
    deletedRequest = await Request.findById(requestId)
      .populate("creator")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!deletedRequest) {
    return next(new HttpError("Could not find request for provided ID.", 404));
  }

  if (deletedRequest.status !== "draft") {
    return next(
      new HttpError(
        "Request with other status than draft cannot be deleted.",
        404
      )
    );
  }

  if (
    deletedRequest.creator.id !== req.user.id &&
    req.user.role.indexOf("admin") === -1
  ) {
    return next(
      new HttpError("You are not authorized to delete this data.", 401)
    );
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    deletedRequest.creator.requests.pull(deletedRequest.id);
    await deletedRequest.creator.save({ session: sess });

    await deletedRequest.remove({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  res.json("Request has been deleted.");
};

//GET 1 REQUEST/////////////////
const getRequest = async (req, res, next) => {
  const requestId = req.params.rid;

  let searchedRequest;
  try {
    searchedRequest = await Request.findById(requestId)
      .populate({
        path: "costCenter",
        select: " name owner",
        populate: { path: "owner", select: "name email id" },
      })
      .populate("history.user", "name email")
      .populate("creator", "name email")
      .populate("orders", "orderId orderSent")

      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!searchedRequest) {
    return next(new HttpError("Could not find request for provided ID.", 404));
  }
  //to correct

  let costCenterRule = true;

  if (searchedRequest.costCenter && searchedRequest.costCenter.owner) {
    costCenterRule = searchedRequest.costCenter.owner.id !== req.user.id;
  }

  if (
    searchedRequest.creator.id !== req.user.id &&
    costCenterRule &&
    req.user.role.indexOf("admin") === -1 &&
    req.user.role.indexOf("report") === -1
  ) {
    return next(
      new HttpError("You are not authorized to view this data.", 401)
    );
  }

  res.json(searchedRequest.toObject({ getters: true }));
};

//GET MULTIPLE REQUEST///////////////
const getRequests = async (req, res, next) => {
  const { status, creator, creationDate, value, requestId, orderId } = req.body;
  //CreationDate to be added.
  const filters = {};
  if (status) filters.status = status;
  if (requestId) filters.requestId = { $regex: `${requestId}`, $options: "i" };
  if (orderId) {
    try {
      const foundOrders = await Order.find(
        {
          orderId: { $regex: `${orderId}`, $options: "i" },
        },
        "id"
      ).exec();
      filters.orders = { $in: foundOrders };
    } catch (err) {
      return next(
        new HttpError(
          `Could not perform this action, please check your data and try again later. ${err}`,
          500
        )
      );
    }
  }

  if (value) filters.value = {};
  //Request user can get only their requests
  if (
    req.user.role.indexOf("admin") === -1 &&
    req.user.role.indexOf("report") === -1
  ) {
    filters.creator = req.user.id;
  } else if (creator) {
    filters.creator = creator;
  }

  let searchedRequests;

  try {
    searchedRequests = await Request.find(
      filters,
      "status value creator creationDate requestId title description"
    )
      .populate("creator", "name id")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  res.json(searchedRequests.map((req) => req.toObject({ getters: true })));
};

exports.createRequest = createRequest;
exports.submitRequest = submitRequest;
exports.withdrawRequest = withdrawRequest;
exports.editRequest = editRequest;
exports.deleteRequest = deleteRequest;
exports.getRequest = getRequest;
exports.getRequests = getRequests;
