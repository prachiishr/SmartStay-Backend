import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema({
  name: String,
  address: String,
  description: String,
  type: String,
  facilities: [String],
  totalCapacity: Number,
  totalRooms: Number,
  isRegistered: Boolean,
  images: [
    {
      url: { type: String, required: true },
      caption: { type: String, default: "" },
    },
  ],
  rooms: [
    {
      name: String,
      modelUrl: String,
      isAvailable: {
        type: Boolean,
        default: true,
      },
      price: { type: Number, required: true },
    },
  ],
  complaints: [
    {
      complaintText: { type: String, required: true },
      resolved: { type: Boolean, default: false },
      complaintDate: { type: Date, default: Date.now },
    },
  ],
});

export const Hostel = mongoose.model("Hostel", hostelSchema);
