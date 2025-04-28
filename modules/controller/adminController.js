import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Contact } from "../../model/contactModel.js";
import { Hostel } from "../../model/hostelModel.js";
import { User } from "../../model/registerModel.js";
import { Staff } from "../../model/staffModel.js";
import bcrypt from "bcrypt";
import fs from "fs";
import s3Client, { generateSignedUrl } from "../../utils/s3Client.js";
import mongoose from "mongoose";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }, { password: 0 });
    if (!users || users.length === 0) {
      return res
        .status(404)
        .json({ status: "failed", message: "No users found" });
    }
    res.status(200).json({ status: "success", data: users });
  } catch (err) {
    console.log("An error occurred:", err);
    res.status(400).json({ status: "failed", error: err });
  }
};

const uploadToS3 = async (filePath, fileName) => {
  const fileStream = fs.createReadStream(filePath);
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: fileStream,
  };
  await s3Client.send(new PutObjectCommand(uploadParams));
};

export const addHostel = async (req, res) => {
  try {
    const {
      name,
      address,
      description,
      type,
      facilities,
      totalCapacity,
      totalRooms,
      isRegistered,
    } = req.body;

    console.log("Files:", req.files);
    console.log("Body:", req.body);

    const rooms = Object.keys(req.body)
      .filter((key) => key.startsWith("rooms["))
      .reduce((acc, key) => {
        const match = key.match(/rooms\[(\d+)\]\.(.+)/);
        if (match) {
          const index = parseInt(match[1], 10);
          const field = match[2];
          acc[index] = acc[index] || {};
          acc[index][field] = req.body[key];
        }
        return acc;
      }, []);

    const roomsWithModels = await Promise.all(
      rooms.map(async (room, index) => {
        const modelFile = req.files.roomModels?.[index];
        const price = req.body[`rooms[${index}].price`];

        if (!price || isNaN(price)) {
          throw new Error(`Price for room ${room.name} is missing or invalid.`);
        }

        const roomData = {
          name: room.name,
          price: parseFloat(price),
          isAvailable: true,
        };

        if (modelFile) {
          const modelFileName = Date.now() + "-" + modelFile.originalname;
          const modelUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${modelFileName}`;

          await uploadToS3(modelFile.path, modelFileName);
          fs.unlinkSync(modelFile.path);

          roomData.modelUrl = modelUrl;
        } else {
          roomData.modelUrl = null;
        }

        return roomData;
      })
    );

    const imageUrls = [];
    if (req.files.images) {
      await Promise.all(
        req.files.images.map(async (image, index) => {
          const imageFileName = Date.now() + "-" + image.originalname;
          const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageFileName}`;

          await uploadToS3(image.path, imageFileName);
          fs.unlinkSync(image.path);

          imageUrls.push({
            url: imageUrl,
            caption: req.body.captions ? req.body.captions[index] : "",
          });
        })
      );
    }

    const newHostel = new Hostel({
      name,
      address,
      description,
      type,
      facilities: facilities.split(",").map((f) => f.trim()),
      totalCapacity,
      totalRooms,
      isRegistered,
      images: imageUrls,
      rooms: roomsWithModels,
    });

    await newHostel.save();
    res
      .status(201)
      .json({ message: "Hostel added successfully!", hostel: newHostel });
  } catch (error) {
    console.error("Error adding hostel:", error);
    res
      .status(500)
      .json({ error: error.message || "Server error, please try again." });
  }
};

export const getAllHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find();

    res.status(200).json({
      status: "success",
      hostels: hostels,
    });
  } catch (error) {
    console.error("Error fetching hostels:", error);
    res.status(500).json({
      status: "failed",
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getHostelById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid hostel ID",
      });
    }

    const hostel = await Hostel.findById(id).populate("rooms");

    if (!hostel) {
      return res.status(404).json({
        status: "failed",
        message: "Hostel not found",
      });
    }

    const signedRoomModels = await Promise.all(
      hostel.rooms.map(async (room) => {
        const key = room.modelUrl.split(".com/")[1];
        return await generateSignedUrl(key);
      })
    );

    res.status(200).json({
      status: "success",
      message: "Hostel fetched successfully",
      data: {
        ...hostel.toObject(),
        roomModels: signedRoomModels,
      },
    });
  } catch (error) {
    console.error("Error fetching hostel by ID:", error);
    res.status(500).json({
      status: "failed",
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getAllMessage = async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Error fetching messages" });
  }
};

export const addStaff = async (req, res) => {
  const { name, email, password, hostelId } = req.body;

  try {
    if (!name) throw "Please enter staff name";
    if (!email) throw "Please enter staff email";
    if (!password) throw "Please enter staff password";
    if (!hostelId) throw "Please enter hostel ID";

    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ message: "Staff already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStaff = new Staff({
      name,
      email,
      password: hashedPassword,
      hostel: hostelId,
    });
    await newStaff.save();

    res
      .status(201)
      .json({ status: "success", message: "Staff added successfully" });
  } catch (error) {
    console.log("An error occurred:", error);
    console.log("An error occurred:", error);
    res.status(500).json({ status: "failed", error: "Server error" });
  }
};

export const getStaff = async (req, res) => {
  try {
    const staffList = await Staff.find().populate("hostel", "name address");
    res.status(200).json({ status: "success", staff: staffList });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch staff" });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const deleted = await Staff.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Staff not found" });
    }
    res.json({ message: "Staff deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting staff" });
  }
};

export const deleteHostel = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedHostel = await Hostel.findByIdAndDelete(id);

    if (!deletedHostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    res
      .status(200)
      .json({ message: "Hostel deleted successfully", hostel: deletedHostel });
  } catch (error) {
    console.error("Error deleting hostel:", error);
    res
      .status(500)
      .json({ message: "Failed to delete hostel", error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete user, please try again later.",
    });
  }
};
