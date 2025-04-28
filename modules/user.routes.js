import express from "express";
import {
  getBookingsForUser,
  sendMessage,
  submitComplaint,
  userLogin,
  userLogout,
  userRegistration,
} from "./controller/userController.js";

const userRoute = express.Router();

userRoute.post("/register", userRegistration);
userRoute.post("/login", userLogin);
userRoute.post("/logout", userLogout);
userRoute.post("/sendmessage", sendMessage);
userRoute.post("/hostels/:hostelId/complaints", submitComplaint);
userRoute.get("/bookings", getBookingsForUser);
export default userRoute;
