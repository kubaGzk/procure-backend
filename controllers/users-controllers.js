const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const ac = require("../models/user-roles");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const createUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { name, email, password, role, active } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email }).exec();
  } catch (err) {
    return next(
      new HttpError("User creation failed, please try again later.", 500)
    );
  }

  if (existingUser) {
    return next(new HttpError("Duplicate user found.", 422));
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(
      new HttpError("User creation failed, please try again later.", 500)
    );
  }

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    active: active || true,
    role: role || ["basic"],
    requests: [],
    contracts: [],
    tasks: [],
  });

  try {
    await newUser.save();
  } catch (err) {
    return next(
      new HttpError("User creation failed, please try again later.", 500)
    );
  }

  let token;
  try {
    token = await jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError("User creation failed, please try again later.", 500)
    );
  }

  res.json({
    token: token,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
  });
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email }).exec();
  } catch (err) {
    return next(
      new HttpError("User loggin failed, please try again later.", 500)
    );
  }

  if (!existingUser) {
    return next(
      new HttpError(
        "Invalid credentials, please check email and password.",
        401
      )
    );
  }

  if (!existingUser.active) {
    return next(new HttpError("User is inactive.", 401));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError("User loggin failed, please try again.", 500));
  }

  if (!isValidPassword) {
    return next(
      new HttpError(
        "Invalid credentials, please check email and password.",
        401
      )
    );
  }

  let token;

  try {
    token = await jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError("User loggin failed, please try again later.", 500)
    );
  }

  res.json({
    token: token,
    name: existingUser.name,
    email: existingUser.email,
    role: existingUser.role,
    id: existingUser.id,
  });
};

const getUsers = async (req, res, next) => {
  const filters = req.body.filters;

  let users;
  try {
    users = await User.find(
      filters,
      "-password -requests -tasks -contracts"
    ).exec();
  } catch (err) {
    return next(
      new HttpError("Could not perform this action, try again later.", 500)
    );
  }
  res.json(users.map((el) => el.toObject({ getters: true })));
};

const patchUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { name, email, active, role, id } = req.body;

  let patchedUser;
  try {
    patchedUser = await User.findById(
      id,
      "-password -requests -tasks -contracts"
    ).exec();
  } catch (err) {
    return next(
      new HttpError("Could not perform this action, try again later.", 500)
    );
  }

  if (!patchedUser) {
    return next(
      new HttpError("Cannot find user in database, please check data.", 404)
    );
  }

  patchedUser.name = name || patchedUser.name;
  patchedUser.email = email || patchedUser.email;
  patchedUser.active = active !== undefined ? active : patchedUser.active;
  patchedUser.role = role || patchedUser.role;

  if(patchedUser.active===false && patchedUser.id===req.user.id){
    return next(
      new HttpError("Cannot deactivate logged user.", 405)
    );
  }

  try {
    await patchedUser.save();
  } catch (err) {
    return next(
      new HttpError("Could not perform this action, try again later.", 500)
    );
  }

  res.status(200).json(patchedUser.toObject({ getters: true }));
};

const resetUser = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid data provided, please check your input and try again.",
        422
      )
    );
  }

  const { id, password } = req.body;

  try {
    patchedUser = await User.findById(id, "-requests -tasks -contracts").exec();
  } catch (err) {
    return next(
      new HttpError("Password reset failed, please try again later.", 500)
    );
  }

  if (!patchedUser) {
    return next(
      new HttpError("Cannot find user in database, please check data.", 404)
    );
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(
      new HttpError("Password reset failed, please try again later.", 500)
    );
  }

  patchedUser.password = hashedPassword;

  try {
    await patchedUser.save();
  } catch (err) {
    return next(
      new HttpError("Password reset failed, please try again later.", 500)
    );
  }

  res.status(200).json({ message: "Password reset succesfull!" });
};

const getDashboard = async (req, res, next) => {
  let foundUser;
  try {
    foundUser = await User.findById(req.user.id, "-password -__v -active -role")
      .populate(
        "requests",
        "creator creationDate requestId status value title description"
      )
      .populate({
        path: "tasks",
        select: "-__v",
        populate: {
          path: "request",
          select: "requestId creator",
          populate: { path: "creator", select: "name" },
        },
      })
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, try again later. ${err}`,
        500
      )
    );
  }

  res.json(foundUser.toObject({ getters: true }));
};

exports.createUser = createUser;
exports.login = login;
exports.getUsers = getUsers;
exports.patchUser = patchUser;
exports.resetUser = resetUser;
exports.getDashboard = getDashboard;
