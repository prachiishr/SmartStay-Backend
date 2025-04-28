import mongoose from "mongoose";
import { Hostel } from "../../model/hostelModel.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../utils/s3Client.js";

export const getHostelDetail = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Received hostelId:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid hostel ID format" });
    }

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      return res.status(404).send({ message: "Hostel not found" });
    }

    const roomsWithSignedUrlsAndAvailability = await Promise.all(
      hostel.rooms.map(async (room) => {
        if (!room.modelUrl)
          return { ...room.toObject(), available: room.available };

        const command = new GetObjectCommand({
          Bucket: "rooms-s3-fyp",
          Key: room.modelUrl,
        });

        try {
          const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600,
          });
          return {
            ...room.toObject(),
            modelUrl: signedUrl,
            available: room.available,
          };
        } catch (error) {
          console.error("Error generating pre-signed URL:", error);
          return { ...room.toObject(), available: room.available };
        }
      })
    );

    res.status(200).json({
      ...hostel.toObject(),
      rooms: roomsWithSignedUrlsAndAvailability,
    });
  } catch (err) {
    console.log("Error:", err);
    res.status(500).send({ message: "Server Error" });
  }
};

export const getHostelDetailById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching details for hostel ID:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid hostel ID format" });
    }

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    res.status(200).json(hostel);
  } catch (error) {
    console.error("Error fetching hostel details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
