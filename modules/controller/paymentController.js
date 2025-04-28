import { Hostel } from "../../model/hostelModel.js";
import Payment from "../../model/paymentModel.js";
import RoomBooking from "../../model/roomBookingModel.js";
import {
  initializeKhaltiPayment,
  verifyKhaltiPayment,
} from "../../utils/khalti.js";

// Function to initialize payment for a booking
export const initializePayment = async (req, res) => {
  try {
    const { hostelId, roomName, totalPrice, website_url } = req.body;
    const userId = req.user ? req.user._id : req.body.userId; // Ensure that we get the userId from the request body or req.user (for logged-in user)

    // Log the received data for debugging
    console.log("Received request:", {
      hostelId,
      roomName,
      totalPrice,
      website_url,
      userId,
    });

    // Check if all required fields are present
    if (!hostelId || !roomName || !totalPrice || !website_url || !userId) {
      return res.status(400).send({
        success: false,
        message: "Missing required fields",
      });
    }

    // Fetch the hostel data based on hostelId and roomName
    const hostelData = await Hostel.findOne({
      _id: hostelId,
      "rooms.name": roomName,
    });

    if (!hostelData) {
      return res.status(400).send({
        success: false,
        message: "Hostel or Room not found",
      });
    }

    console.log("Hostel data found:", hostelData);

    // Find the room data within the hostel
    const roomData = hostelData.rooms.find((room) => room.name === roomName);

    if (!roomData) {
      return res.status(400).send({
        success: false,
        message: "Room not found in the specified hostel",
      });
    }

    console.log("Room data found:", roomData);

    // Create a new room booking record, associating it with the user who is booking
    const roomBookingData = await RoomBooking.create({
      hostelId,
      roomName,
      paymentMethod: "khalti",
      totalPrice: totalPrice * 100, // Converting total price to the smallest unit (e.g., cents)
      bookedBy: userId, // Ensure the bookedBy field stores the correct user ID
    });

    console.log("Room booking data created:", roomBookingData);

    // Initiate Khalti payment
    const paymentInitiate = await initializeKhaltiPayment({
      amount: totalPrice * 100, // Amount for Khalti (converted to the smallest unit)
      purchase_order_id: roomBookingData._id,
      purchase_order_name: roomName,
      return_url: `${process.env.BACKEND_URI}/payments/complete-khalti-payment`,
      website_url,
    });

    console.log("Khalti payment initiation response:", paymentInitiate);

    // Send response to the frontend with room booking and payment details
    res.json({
      success: true,
      roomBookingData,
      payment: paymentInitiate,
    });
  } catch (error) {
    console.error("Error during payment initialization:", error);

    // Return error response if something goes wrong
    res.json({
      success: false,
      error: error.message || "An error occurred",
    });
  }
};

// Function to complete the payment after Khalti's response
export const completePayment = async (req, res) => {
  const {
    pidx,
    txnId,
    amount,
    mobile,
    purchase_order_id,
    purchase_order_name,
    transaction_id,
  } = req.query;

  try {
    // Verify payment with Khalti
    const paymentInfo = await verifyKhaltiPayment(pidx);

    // Check if the payment was successful and matches the expected data
    if (
      paymentInfo?.status !== "Completed" ||
      paymentInfo.transaction_id !== transaction_id ||
      Number(paymentInfo.total_amount) !== Number(amount)
    ) {
      return res.status(400).json({
        success: false,
        message: "Incomplete information",
        paymentInfo,
      });
    }

    // Fetch the room booking record based on the purchase order ID
    const roomBookingData = await RoomBooking.findById(purchase_order_id);

    if (!roomBookingData) {
      return res.status(400).send({
        success: false,
        message: "Room booking data not found",
      });
    }

    // Update the booking status to "completed"
    await RoomBooking.findByIdAndUpdate(purchase_order_id, {
      $set: {
        status: "completed",
      },
    });

    // Create a new payment record to store the payment details
    const paymentData = await Payment.create({
      pidx,
      transactionId: transaction_id,
      productId: purchase_order_id,
      amount,
      dataFromVerificationReq: paymentInfo,
      apiQueryFromUser: req.query,
      paymentGateway: "khalti",
      status: "success",
    });

    // Send the response confirming the payment was successful
    res.json({
      success: true,
      message: "Payment Successful",
      paymentData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred",
      error,
    });
  }
};
