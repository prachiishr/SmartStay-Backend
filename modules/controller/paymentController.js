import { Hostel } from "../../model/hostelModel.js";
import Payment from "../../model/paymentModel.js";
import RoomBooking from "../../model/roomBookingModel.js";
import {
  initializeKhaltiPayment,
  verifyKhaltiPayment,
} from "../../utils/khalti.js";

export const initializePayment = async (req, res) => {
  try {
    const { hostelId, roomName, totalPrice, website_url } = req.body;
    const userId = req.user ? req.user._id : req.body.userId;
    console.log("Received request:", {
      hostelId,
      roomName,
      totalPrice,
      website_url,
      userId,
    });

    if (!hostelId || !roomName || !totalPrice || !website_url || !userId) {
      return res.status(400).send({
        success: false,
        message: "Missing required fields",
      });
    }

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

    const roomData = hostelData.rooms.find((room) => room.name === roomName);

    if (!roomData) {
      return res.status(400).send({
        success: false,
        message: "Room not found in the specified hostel",
      });
    }

    console.log("Room data found:", roomData);

    const roomBookingData = await RoomBooking.create({
      hostelId,
      roomName,
      paymentMethod: "khalti",
      totalPrice: totalPrice * 100,
      bookedBy: userId,
    });

    console.log("Room booking data created:", roomBookingData);

    const paymentInitiate = await initializeKhaltiPayment({
      amount: totalPrice * 100,
      purchase_order_id: roomBookingData._id,
      purchase_order_name: roomName,
      return_url: `${process.env.BACKEND_URI}/payments/complete-khalti-payment`,
      website_url,
    });

    console.log("Khalti payment initiation response:", paymentInitiate);

    res.json({
      success: true,
      roomBookingData,
      payment: paymentInitiate,
    });
  } catch (error) {
    console.error("Error during payment initialization:", error);

    res.json({
      success: false,
      error: error.message || "An error occurred",
    });
  }
};

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
    const paymentInfo = await verifyKhaltiPayment(pidx);

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

    const roomBookingData = await RoomBooking.findById(purchase_order_id);

    if (!roomBookingData) {
      return res.status(400).send({
        success: false,
        message: "Room booking data not found",
      });
    }

    await RoomBooking.findByIdAndUpdate(purchase_order_id, {
      $set: {
        status: "completed",
      },
    });

    await Payment.create({
      pidx,
      transactionId: transaction_id,
      productId: purchase_order_id,
      amount,
      dataFromVerificationReq: paymentInfo,
      apiQueryFromUser: req.query,
      paymentGateway: "khalti",
      status: "success",
    });

    res.redirect(`${process.env.FRONTEND_URI}/success`);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred",
      error,
    });
  }
};
