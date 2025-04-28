import express from "express";
import { completePayment, initializePayment } from "./paymentController.js";

const paymentRoute = express.Router();

paymentRoute.post("/initialize-khalti", initializePayment);

paymentRoute.get("/complete-khalti-payment", completePayment);

export default paymentRoute;
