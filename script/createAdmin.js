import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../model/registerModel.js";

dotenv.config();

mongoose
  .connect(process.env.mongodb_conn, {})
  .then(() => console.log("Connection is successfully made"))
  .catch(() => {
    console.log("connection to the database has failed");
  });

const createAdmin = async () => {
  try {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASS, 10);
    const admin = new User({
      name: "Prachi Shrestha",
      email: process.env.ADMIN_MAIL,
      password: hashedPassword,
      role: "admin",
      isVerified: true,
    });

    await admin.save();
    console.log("admin was created successfully");
  } catch (err) {
    console.log("An error occurred:", err);
  }
};
createAdmin().catch(console.error);
