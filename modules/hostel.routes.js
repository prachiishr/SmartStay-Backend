import express from "express";
import {
  getHostelDetail,
  getHostelDetailById,
} from "./controller/hostelController.js";

const hostelRoute = express.Router();

hostelRoute.get("/:id", getHostelDetail);
hostelRoute.get("/detail/:id", getHostelDetailById);

export default hostelRoute;
