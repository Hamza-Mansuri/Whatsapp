import crypto from 'crypto';

/**
 * OTP Service for sending and managing OTPs.
 * Uses environment variables to toggle development mode.
 */

// Generate a cryptographically secure 6-digit OTP
export const generateOtp = () => {
  // Generate a random number between 100000 and 999999
  return crypto.randomInt(100000, 1000000).toString();
};

// Hash the OTP with SHA-256
export const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Send OTP via configured provider.
 * If OTP_DEV_MODE is true, it only logs the OTP to the console.
 */
export const sendOtp = async (phoneNumber, otp) => {
  const isDevMode = process.env.OTP_DEV_MODE === 'true';

  if (isDevMode) {
    console.log(`\n========================================`);
    console.log(`[DEV MODE] OTP for ${phoneNumber}: ${otp}`);
    console.log(`========================================\n`);
    return true; // Simulate success
  }

  // TODO: Integrate actual SMS provider (Twilio, AWS SNS, etc.)
  // Example for Twilio:
  // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   body: `Your WhatsApp clone verification code is ${otp}.`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phoneNumber
  // });
  
  console.log(`[PROD MODE] SMS Provider not fully configured. Assuming success for ${phoneNumber}`);
  return true; 
};
