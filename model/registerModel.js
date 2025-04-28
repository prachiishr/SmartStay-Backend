import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    password: { type: String },

    isVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    verifyToken: { type: String },
    verifyTokenExpires: { type: Date },
    role: { type: String, default: "user" },
  },
  { timestamps: true }
);

export const User = mongoose.model("user", userSchema);
