const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const usersRoutes = require("./routes/users-routes");
const suppliersRoutes = require("./routes/suppliers-routes");
const catalogsRoutes = require("./routes/catalogs-routes");
const requestsRoutes = require("./routes/requests-routes");
const costCenterRoutes = require("./routes/cost-centers-routes");
const taskRoutes = require("./routes/tasks-routes");
const ordersRoutes = require("./routes/orders-routes");

const HttpError = require("./models/http-error");
const Category = require("./models/category");

const app = express();

app.use(bodyParser.json());

//Static files
app.use("/uploads/images", express.static(path.join("uploads", "images")));

//Setup of headers - Origin, Headers and Methods
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

//ROUTES:

app.use("/api/users", usersRoutes);

app.use("/api/suppliers", suppliersRoutes);

app.use("/api/catalogs", catalogsRoutes);

app.use("/api/requests", requestsRoutes);

app.use("/api/costcenters", costCenterRoutes);

app.use("/api/tasks", taskRoutes);

app.use("/api/orders", ordersRoutes);

//No route handler
app.use((req, res, next) => {
  throw new HttpError("Could not find this route.", 404);
});

//Sending error message and code to client
app.use((error, req, res, next) => {
  //Remove file if error occurs
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      err && console.log(err);
    });
  }

  if (req.files) {
    for (let file in req.files) {
      fs.unlink(req.files[file][0].path, (err) => {
        err && console.log(err);
      });
    }
  }

  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-2ux13.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => app.listen(5001))
  .catch((err) => console.log(err));
