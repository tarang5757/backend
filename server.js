const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const dotenv = require("dotenv");

const app = express();
// Configure environment variables
dotenv.config();

// Proper CORS configuration for production
app.use(
  cors({
    origin: "https://open-doors.ca",
    credentials: true,
  })
);
app.use(express.json());

// Hello World test route (still useful for deployment testing)
app.get("/", (req, res) => {
  res.json({
    message: "Hello World! Backend is successfully deployed on Heroku!",
    status: "operational",
    environment: process.env.NODE_ENV || "development",
  });
});

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

    const farmerMessageBody = `New Open-Doors Match Found!

    Organization Details:
    Name: ${recipient.organizationName || "Unnamed Organization"}
    Contact: ${recipient.contactName || "Organization Contact"}
    Phone: ${recipient.phone}
    Address: ${recipient.address || "N/A"}, ${recipient.city || "N/A"}, ${
      recipient.state || "N/A"
    }

    Food Needs:
    ${
      recipient.foodDetails.neededFoodTypes.length > 0
        ? recipient.foodDetails.neededFoodTypes
            .map((food) => `• ${food}`)
            .join("\n")
        : "Various produce"
    }

    Urgency Level: ${recipient.foodDetails.urgencyLevel || "Not specified"}
    Transportation: ${
      recipient.foodDetails.transportationAvailable
        ? "Can arrange pickup"
        : "Needs delivery"
    }
    Pickup Radius: ${
      recipient.foodDetails.pickupRadius
        ? `${recipient.foodDetails.pickupRadius} miles`
        : "Not specified"
    }
    Preferred Days: ${
      recipient.foodDetails.preferredDeliveryDays.length > 0
        ? recipient.foodDetails.preferredDeliveryDays.join(", ")
        : "Flexible"
    }`;

    const recipientMessageBody = `New Open Doors Match Found!

    Farm Details:
    Name: ${farmer.organizationName || "Unnamed Farm"}
    Contact: ${farmer.contactName || "Farm Contact"}
    Phone: ${farmer.phone}
    Address: ${farmer.address || "N/A"}, ${farmer.city || "N/A"}, ${
      farmer.state || "N/A"
    }

    Available Crops:
    ${
      farmer.foodDetails.cropTypes.length > 0
        ? farmer.foodDetails.cropTypes.map((crop) => `• ${crop}`).join("\n")
        : "Various produce"
    }

    Delivery: ${
      farmer.foodDetails.deliveryCapability ? "Offers delivery" : "Pickup only"
    }${
      farmer.foodDetails.deliveryCapability && farmer.foodDetails.deliveryRadius
        ? ` (within ${farmer.foodDetails.deliveryRadius} miles)`
        : ""
    }
    Available Days: ${
      farmer.foodDetails.availableDays.length > 0
        ? farmer.foodDetails.availableDays.join(", ")
        : "Flexible"
    }`;

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

// Add this at the end of the file, before any exports
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
