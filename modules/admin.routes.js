import express from "express";
import {
  addHostel,
  addStaff,
  deleteHostel,
  deleteStaff,
  deleteUser,
  getAllHostels,
  getAllMessage,
  getAllUsers,
  getHostelById,
  getStaff,
} from "./controller/adminController.js";
import { uploadMiddleware } from "../middleware/multer.js";

const adminRoute = express.Router();
adminRoute.post("/addhostel", uploadMiddleware, addHostel);
adminRoute.get("/getuser", getAllUsers);
adminRoute.get("/gethostel", getAllHostels);
adminRoute.get("/hostels/:id", getHostelById);
adminRoute.get("/getmessage", getAllMessage);
adminRoute.post("/addstaff", addStaff);
adminRoute.get("/getstaff", getStaff);
adminRoute.delete("/deletestaff/:id", deleteStaff);
adminRoute.delete("/deletehostel/:id", deleteHostel);
adminRoute.delete("/deleteuser/:id", deleteUser);

export default adminRoute;
