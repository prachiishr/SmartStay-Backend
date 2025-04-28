import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoute from "./modules/user.routes.js";
import adminRoute from "./modules/admin.routes.js";
import staffRoute from "./modules/staff.routes.js";
import hostelRoute from "./modules/hostel.routes.js";
import paymentRoute from "./modules/controller/payment.route.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const mongodb_conn = process.env.mongodb_conn;

mongoose
  .connect(mongodb_conn, {})
  .then(() => console.log("Connection is successfully made"))
  .catch(() => {
    console.log("connection to the database has failed");
  });

app.use("/auth", userRoute);
app.use("/admin", adminRoute);
app.use("/hostel", hostelRoute);
app.use("/staff", staffRoute);
app.use("/payments", paymentRoute);

app.listen(8000, () => {
  console.log("server is successfully running");
});
