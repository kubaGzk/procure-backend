const mongoose = require("mongoose");
const mailer = require("../controllers/emails-controllers");

const Task = require("../models/task");
const HttpError = require("../models/http-error");
const Order = require("../models/order");
const CostCenter = require("../models/cost-center");

const approveTask = async (req, res, next) => {
  const taskId = req.params.tid;

  let appTask;
  try {
    appTask = await Task.findById(taskId)
      .populate("request")
      .populate("owner", "tasks")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!appTask) {
    return next(new HttpError("Could not find task for provided ID", 404));
  }

  if (
    appTask.owner.id !== req.user.id &&
    req.user.role.indexOf("admin") === -1
  ) {
    return next(
      new HttpError("You are not authorized to edit this data.", 401)
    );
  }

  if (appTask.status !== "pending") {
    return next(
      new HttpError(
        "Could not approve task with other status than pending",
        422
      )
    );
  }

  //Set up order data - single order for each supplier
  let orderData;
  let orderList = [];

  try {
    orderData = appTask.request.items.reduce((acc, item) => {
      const supId = item.supplier.id.toString();

      if (!acc.hasOwnProperty(supId)) {
        const val = +(item.price * item.quantity).toFixed(2);

        acc[supId] = {
          title: appTask.request.title,
          description: appTask.request.description,
          value: val,
          items: [
            {
              catalogItemId: item.id,
              name: item.name,
              description: item.description,
              price: item.price,
              quantity: item.quantity,
            },
          ],
          creator: appTask.request.creator,
          orderDate: new Date(),
          address: appTask.request.address,
          supplier: item.supplier,
          request: appTask.request.id,
          orderSent: false,
        };
      } else {
        const val = +(item.price * item.quantity).toFixed(2);
        acc[supId].value = +(val + acc[supId].value).toFixed(2);

        acc[supId].items.push({
          catalogItemId: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          quantity: item.quantity,
        });
      }
      return acc;
    }, {});

    //Update task
    appTask.status = "approved";
    appTask.completionDate = new Date();

    //Update request
    appTask.request.status = "approved";
    appTask.request.history.push({
      type: "approve",
      user: req.user.id,
      date: new Date(),
    });

    //Update owner
    appTask.owner.tasks.pull(appTask.id);

    //Start Session
    const sess = await mongoose.startSession();
    sess.startTransaction();

    //Save every order, then add order ID
    for (let key in orderData) {
      //Create and save order
      let ord = new Order(orderData[key]);
      await ord.save({ session: sess });

      //Push order to request orders
      appTask.request.orders.push(ord.id);
      await appTask.request.save({ session: sess });
      await appTask.save({ session: sess });

      //Create custom ID based on index field
      const ordId = "P" + ord.ind.toString().padStart(5, 0);
      ord.orderId = ordId;

      //Last save of order
      await ord.save({ session: sess });

      //List of orders to send
      orderList.push(ord);
    }

    await appTask.owner.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later.... ${err}`,
        500
      )
    );
  }

  //Sending messages
  try {
    let foundOrder; //Need to find order to add history to request
    for (let order of orderList) {
      foundOrder = await Order.findById(order.id)
        .populate("request", "history")
        .populate("creator", "name");

      mailer
        .sendOrder(foundOrder)
        .then(async (info) => {
          const sess = await mongoose.startSession();
          sess.startTransaction();

          foundOrder.request.history.push({
            type: "order",
            user: foundOrder.creator,
            date: new Date(),
            comments:
              "Order has been succesfully delivered to supplier email address.",
          });

          await foundOrder.request.save({ session: sess });

          foundOrder.orderSent = true;
          await foundOrder.save({ session: sess });

          await sess.commitTransaction();
        })
        .catch(async (err) => {
          const sess = await mongoose.startSession();
          sess.startTransaction();

          foundOrder = await Order.findById(order.id).populate(
            "request",
            "history"
          );
          foundOrder.request.history.push({
            type: "order",
            user: foundOrder.creator,
            date: new Date(),
            comments:
              "Could not send order to supplier email address. Order needs to be send manually.",
          });

          await foundOrder.request.save({ session: sess });

          foundOrder.orderSent = false;
          await foundOrder.save({ session: sess });

          await sess.commitTransaction();
        });
    }
  } catch (err) {
    console.log(err);
  }

  res.json({ message: `Task ${taskId} has been approved.` });
};

const declineTask = async (req, res, next) => {
  const taskId = req.params.tid;

  let decTask;
  try {
    decTask = await Task.findById(taskId)
      .populate("request")
      .populate("owner", "tasks")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!decTask) {
    return next(new HttpError("Could not find task for provided ID", 404));
  }
  if (
    decTask.owner.id !== req.user.id &&
    req.user.role.indexOf("admin") === -1
  ) {
    return next(
      new HttpError("You are not authorized to edit this data.", 401)
    );
  }

  if (decTask.status !== "pending") {
    return next(
      new HttpError(
        "Could not decline task with other status than pending",
        422
      )
    );
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    //Task update
    decTask.status = "declined";
    decTask.completionDate = new Date();

    //Request update
    decTask.request.status = "declined";
    decTask.request.history.push({
      type: "decline",
      user: req.user.id,
      date: new Date(),
    });

    //User update
    decTask.owner.tasks.pull(decTask.id);

    //Cost center clearance
    const costCenter = await CostCenter.findById(
      decTask.request.costCenter
    ).exec();
    if (!costCenter) throw new Error("Could not find cost center.");

    costCenter.spend = costCenter.spend - decTask.request.value;
    costCenter.requests.pull(decTask.request.id);

    await decTask.save({ session: sess });
    await decTask.request.save({ session: sess });
    await decTask.owner.save({ session: sess });
    await costCenter.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  res.json({ message: `Task ${taskId} has been declined.` });
};

const getTasks = async (req, res, next) => {};

exports.approveTask = approveTask;
exports.declineTask = declineTask;
exports.getTasks = getTasks;
