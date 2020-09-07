const { validationResult } = require("express-validator");

const CostCenter = require("../models/cost-center");
const User = require("../models/user");
const HttpError = require("../models/http-error");

const createCostcenter = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { owner, name, budget, budgetLimited } = req.body;

  if (budgetLimited && !budget) {
    return next(
      new HttpError(
        "Cost center has been set as budget limited, but no budget data was provided",
        422
      )
    );
  }
  let user;
  try {
    user = await User.findById(owner).exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!user) {
    return next(new HttpError(`Could not find user.`, 404));
  }

  const bdgLim = budgetLimited ? budgetLimited : false;

  const newCostCenter = new CostCenter({
    owner,
    name,
    budget: parseInt(budget),
    budgetLimited: bdgLim,
    active: true,
    spend: 0,
  });

  try {
    await newCostCenter.save();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  res.json(newCostCenter.toObject({ getters: true })).status(201);
};

const updateCostCenter = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }
  const costCenterId = req.params.cid;
  const { owner, name, budget, budgetLimited, active } = req.body;

  const updatedCostCenter = await CostCenter.findById(costCenterId).exec();

  let bdgLim;
  let act;

  //Check if budget limited is undefined
  if (budgetLimited === undefined || budgetLimited === null) {
    bdgLim = updatedCostCenter.budgetLimited;
  } else {
    bdgLim = budgetLimited;
  }

  //Check if active is undefined
  if (active === undefined || active === null) {
    act = updatedCostCenter.active;
  } else {
    act = active;
  }

  //Budget check
  if (budgetLimited && !budget) {
    return next(
      new HttpError(
        "Cost center has been set as budget limited, but budget data was not provided.",
        422
      )
    );
  }

  if (budgetLimited && budget < updatedCostCenter.spend) {
    return next(
      new HttpError(
        "Provided budget is lower than current spend, could not change budget.",
        422
      )
    );
  }

  updatedCostCenter.owner = owner || updatedCostCenter.owner;
  updatedCostCenter.name = name || updatedCostCenter.name;
  updatedCostCenter.budget = parseFloat(budget) || updatedCostCenter.budget;
  updatedCostCenter.active = act;
  updatedCostCenter.budgetLimited = bdgLim;

  try {
    await updatedCostCenter.save();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  res.json(updatedCostCenter.toObject({ getters: true }));
};

const getCostCenter = async (req, res, next) => {
  const costCenterId = req.params.cid;

  const existingCostCenter = await CostCenter.findById(costCenterId);

  if (
    existingCostCenter.owner !== req.user.id &&
    req.user.role.indexOf("admin") === -1
  )
    return next(
      new HttpError("You are not authorized to read this data.", 401)
    );

  res.json(existingCostCenter.toObject({ getters: true }));
};

const getCostCenterList = async (req, res, next) => {
  let costCenters;
  try {
    costCenters = await CostCenter.find({ active: true }, "id owner name")
      .populate("owner", "id name email")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }
  res.json(costCenters.map((cc) => cc.toObject({ getters: true })));
};

exports.createCostcenter = createCostcenter;
exports.updateCostCenter = updateCostCenter;
exports.getCostCenter = getCostCenter;
exports.getCostCenterList = getCostCenterList;
