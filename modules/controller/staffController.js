import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Staff } from "../../model/staffModel.js";
import { Hostel } from "../../model/hostelModel.js";
import s3Client from "../../utils/s3Client.js";
import mongoose from "mongoose";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import RoomBooking from "../../model/roomBookingModel.js";
import { User } from "../../model/registerModel.js";

export const loginStaff = async (req, res) => {
  const { email, password } = req.body;

  try {
    const staff = await Staff.findOne({ email }).populate("hostel");

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: staff._id }, "your_secret_key", {
      expiresIn: "1d",
    });

    res.status(200).json({ staff, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getHostelDetailForStaff = async (req, res) => {
  try {
    const { staffId, hostelId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(staffId) ||
      !mongoose.Types.ObjectId.isValid(hostelId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const staff = await Staff.findById(staffId).populate("hostel");
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    if (staff.hostel._id.toString() !== hostelId) {
      return res
        .status(403)
        .json({ message: "You do not have access to this hostel" });
    }

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    const roomsWithSignedUrls = await Promise.all(
      hostel.rooms.map(async (room) => {
        if (!room.modelUrl) return room;

        const modelKey = room.modelUrl.replace(
          "https://rooms-s3-fyp.s3.us-east-1.amazonaws.com/",
          ""
        );

        const command = new GetObjectCommand({
          Bucket: "rooms-s3-fyp",
          Key: modelKey,
        });

        try {
          const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600,
          });
          return { ...room.toObject(), modelUrl: signedUrl };
        } catch (error) {
          console.error("Error generating pre-signed URL:", error);
          return room;
        }
      })
    );

    res.status(200).json({ ...hostel.toObject(), rooms: roomsWithSignedUrls });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleRoomAvailability = async (req, res) => {
  const { hostelId, roomIndex } = req.params;

  try {
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ message: "Hostel not found" });

    const index = parseInt(roomIndex);
    if (isNaN(index) || index < 0 || index >= hostel.rooms.length) {
      return res.status(400).json({ message: "Invalid room index" });
    }

    hostel.rooms[index].isAvailable = !hostel.rooms[index].isAvailable;
    await hostel.save();

    res.status(200).json({
      message: "Room availability toggled",
      room: hostel.rooms[index],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getComplaints = async (req, res) => {
  const { hostelId } = req.params;

  try {
    const hostel = await Hostel.findById(hostelId);

    if (!hostel) {
      return res
        .status(404)
        .json({ status: "error", message: "Hostel not found" });
    }

    res.status(200).json({
      status: "success",
      complaints: hostel.complaints,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

export const resolveComplaint = async (req, res) => {
  const { hostelId, complaintId } = req.params;

  try {
    const hostel = await Hostel.findById(hostelId);

    if (!hostel) {
      return res
        .status(404)
        .json({ status: "error", message: "Hostel not found" });
    }

    const complaint = hostel.complaints.id(complaintId);

    if (!complaint) {
      return res
        .status(404)
        .json({ status: "error", message: "Complaint not found" });
    }

    complaint.resolved = true;
    await hostel.save();

    res
      .status(200)
      .json({ status: "success", message: "Complaint marked as resolved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

export const getAllBookingsForStaff = async (req, res) => {
  try {
    const bookings = await RoomBooking.find()
      .populate("bookedBy", "name email phone")
      .populate("hostelId", "name");

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};
