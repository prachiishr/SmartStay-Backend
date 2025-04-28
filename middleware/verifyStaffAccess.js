import { Staff } from "../model/staffModel";

export const verifyStaffAccess = async (req, res, next) => {
  const staffId = req.user.id;
  const { hostelId } = req.params;

  try {
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    if (staff.hostel.toString() !== hostelId) {
      return res.status(403).json({ message: "Unauthorized: Access denied" });
    }

    next();
  } catch (err) {
    console.error("Error verifying staff access:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
