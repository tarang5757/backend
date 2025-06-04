const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const dotenv = require("dotenv");

const app = express();
app.use(cors());
app.use(express.json());

// Configure environment variables
dotenv.config();

// Initialize Twilio client with hardcoded credentials
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID, // Your Twilio Account SID
  process.env.TWILIO_AUTH_TOKEN // Your Twilio Auth Token
);

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

// Test notification endpoint
app.post("/api/send-test-notification", async (req, res) => {
  try {
    const { phoneNumber, message, type } = req.body;

    if (type === "whatsapp") {
      await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phoneNumber}`,
      });
    } else {
      await twilioClient.messages.create({
        body: message,
        from: TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
    }

    res.json({ success: true, message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to send notification",
    });
  }
});

// General notification endpoint
app.post("/api/send-notification", async (req, res) => {
  try {
    const { phoneNumber, message, type } = req.body;

    if (type === "whatsapp") {
      await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phoneNumber}`,
      });
    } else {
      await twilioClient.messages.create({
        body: message,
        from: TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
    }

    res.json({ success: true, message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to send notification",
    });
  }
});

// Endpoint for sending match notifications
app.post("/api/send-match-notification", async (req, res) => {
  console.log("Received match notification request:", req.body);
  try {
    const { matchId, farmer, recipient } = req.body;

    // Basic validation
    if (
      !matchId ||
      !farmer ||
      !recipient ||
      !farmer.phone ||
      !recipient.phone
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required notification data." });
    }

    // Construct message bodies with detailed match information
    const farmerMessageBody = `New Food Share Match Found!\n\nOrganization Details:\nName: ${
      recipient.organizationName || "Unnamed Organization"
    }\nContact: ${recipient.contactName || "Organization Contact"}\nPhone: ${
      recipient.phone
    }\n\nFood Needs:\n${
      recipient.foodDetails.neededFoodTypes.length > 0
        ? recipient.foodDetails.neededFoodTypes
            .map((food) => `• ${food}`)
            .join("\n")
        : "Various produce"
    }\n\nUrgency Level: ${
      recipient.foodDetails.urgencyLevel || "Not specified"
    }\nTransportation: ${
      recipient.foodDetails.transportationAvailable
        ? "Can arrange pickup"
        : "Needs delivery"
    }\nPickup Radius: ${
      recipient.foodDetails.pickupRadius
        ? `${recipient.foodDetails.pickupRadius} miles`
        : "Not specified"
    }\nPreferred Days: ${
      recipient.foodDetails.preferredDeliveryDays.length > 0
        ? recipient.foodDetails.preferredDeliveryDays.join(", ")
        : "Flexible"
    }\n\nCheck the app for details!`;

    const recipientMessageBody = `New Food Share Match Found!\n\nFarm Details:\nName: ${
      farmer.organizationName || "Unnamed Farm"
    }\nContact: ${farmer.contactName || "Farm Contact"}\nPhone: ${
      farmer.phone
    }\n\nAvailable Crops:\n${
      farmer.foodDetails.cropTypes.length > 0
        ? farmer.foodDetails.cropTypes.map((crop) => `• ${crop}`).join("\n")
        : "Various produce"
    }\n\nDelivery: ${
      farmer.foodDetails.deliveryCapability ? "Offers delivery" : "Pickup only"
    }${
      farmer.foodDetails.deliveryCapability && farmer.foodDetails.deliveryRadius
        ? ` (within ${farmer.foodDetails.deliveryRadius} miles)`
        : ""
    }\nAvailable Days: ${
      farmer.foodDetails.availableDays.length > 0
        ? farmer.foodDetails.availableDays.join(", ")
        : "Flexible"
    }\n\nCheck the app for details!`;

    // Send notifications based on preferences
    const notificationPromises = [];

    // Send to Farmer
    if (farmer.preferences && farmer.preferences.sms && farmer.phone) {
      console.log(
        `Attempting to send SMS to farmer ${farmer.id} at ${farmer.phone}`
      );
      notificationPromises.push(
        twilioClient.messages
          .create({
            body: farmerMessageBody,
            from: TWILIO_PHONE_NUMBER,
            to: farmer.phone,
          })
          .catch((error) =>
            console.error(`Error sending SMS to farmer ${farmer.id}:`, error)
          )
      );
    }
    if (farmer.preferences && farmer.preferences.whatsapp && farmer.whatsapp) {
      console.log(
        `Attempting to send WhatsApp to farmer ${farmer.id} at ${farmer.whatsapp}`
      );
      notificationPromises.push(
        twilioClient.messages
          .create({
            body: farmerMessageBody,
            from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${farmer.whatsapp}`,
          })
          .catch((error) =>
            console.error(
              `Error sending WhatsApp to farmer ${farmer.id}:`,
              error
            )
          )
      );
    }

    // Send to Recipient
    if (recipient.preferences && recipient.preferences.sms && recipient.phone) {
      console.log(
        `Attempting to send SMS to recipient ${recipient.id} at ${recipient.phone}`
      );
      notificationPromises.push(
        twilioClient.messages
          .create({
            body: recipientMessageBody,
            from: TWILIO_PHONE_NUMBER,
            to: recipient.phone,
          })
          .catch((error) =>
            console.error(
              `Error sending SMS to recipient ${recipient.id}:`,
              error
            )
          )
      );
    }
    if (
      recipient.preferences &&
      recipient.preferences.whatsapp &&
      recipient.whatsapp
    ) {
      console.log(
        `Attempting to send WhatsApp to recipient ${recipient.id} at ${recipient.whatsapp}`
      );
      notificationPromises.push(
        twilioClient.messages
          .create({
            body: recipientMessageBody,
            from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${recipient.whatsapp}`,
          })
          .catch((error) =>
            console.error(
              `Error sending WhatsApp to recipient ${recipient.id}:`,
              error
            )
          )
      );
    }

    // Wait for all notification promises to settle
    await Promise.allSettled(notificationPromises);

    res.json({
      success: true,
      message: "Match notifications sent (check logs for details).",
    });
  } catch (error) {
    console.error("Error processing match notification:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process match notification",
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
