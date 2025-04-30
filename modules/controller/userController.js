import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateVerifyToken } from "../../utils/generateVerifyToken.js";
import { generatejwtToken } from "../../utils/generatejwtToken.js";
import { User } from "../../model/registerModel.js";
import { Contact } from "../../model/contactModel.js";
import { Hostel } from "../../model/hostelModel.js";
import RoomBooking from "../../model/roomBookingModel.js";

export const userRegistration = async (req, res) => {
  const { name, email, password } = req.body;

  console.log("Request body:", req.body);

  try {
    if (!name) throw new Error("Please enter your name");
    if (!email) throw new Error("Please enter your email");
    if (!password) throw new Error("Please enter your password");
    if (password.length < 6)
      throw new Error("Password must be 6 characters or more");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    const encPass = await bcrypt.hash(password, 10);
    const verifyToken = generateVerifyToken();

    const user = new User({
      name,
      email,
      password: encPass,
      verifyToken,
      verifyTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
    });
    await user.save();

    generatejwtToken(res, user._id);
    res
      .status(201)
      .json({ status: "success", message: "User registered successfully" });
  } catch (error) {
    console.log("An error occurred:", error);
    res.status(400).json({ status: "failed", error: error.message || error });
  }
};

export const userLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) throw "Please enter your email or password";

    const getUser = await User.findOne({ email: email });

    if (!getUser) throw "User not found";

    const comparePass = await bcrypt.compare(password, getUser.password);

    if (!comparePass) throw "Invalid password";

    const getToken = jwt.sign(
      { userId: getUser._id, email: getUser.email, name: getUser.name },
      "secrethai"
    );

    res.json({
      status: "success",
      token: getToken,
      userId: getUser._id,
      role: getUser.role,
    });
  } catch (err) {
    console.log("An error occurred:", err);
    res.status(400).json({ status: "failed", error: err });
  }
};

export const userLogout = (req, res) => {
  res.clearCookie("token");
  res.json({ status: "success", message: "User logged out successfully" });
};

export const sendMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newContact = new Contact({ name, email, message });
    await newContact.save();
    res.status(201).json({ message: "Message stored successfully!" });
  } catch (error) {
    console.error("Error storing message:", error);
    res.status(500).json({ error: "Error storing message" });
  }
};

export const submitComplaint = async (req, res) => {
  try {
    const { complaintText } = req.body;
    const hostelId = req.params.hostelId;

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res
        .status(404)
        .json({ status: "error", message: "Hostel not found" });
    }

    hostel.complaints.push({ complaintText });

    await hostel.save();

    res.status(201).json({
      status: "success",
      message: "Complaint submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting complaint:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
};

export const getBookingsForUser = async (req, res) => {
  try {
    const { userId } = req.query;
    const bookings = await RoomBooking.find({ bookedBy: userId }).populate(
      "hostelId"
    );
    res.json({ bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching bookings" });
  }
};
