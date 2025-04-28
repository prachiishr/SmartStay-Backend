import express from "express";
import {
  getAllBookingsForStaff,
  getComplaints,
  getHostelDetailForStaff,
  loginStaff,
  resolveComplaint,
  toggleRoomAvailability,
} from "./controller/staffController.js";

const staffRoute = express.Router();

staffRoute.post("/login", loginStaff);
staffRoute.patch(
  "/hostels/:hostelId/rooms/:roomIndex/toggle-availability",
  toggleRoomAvailability
);
staffRoute.get("/:staffId/hostels/:hostelId", getHostelDetailForStaff);

staffRoute.get("/hostels/:hostelId/complaints", getComplaints);
staffRoute.patch(
  "/hostels/:hostelId/complaints/:complaintId/resolve",
  resolveComplaint
);
staffRoute.get("/bookings", getAllBookingsForStaff);

export default staffRoute;
