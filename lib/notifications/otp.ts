/**
 * OTP integration point.
 *
 * KaamSet v1 does NOT send OTPs: no SMS/WhatsApp provider is configured, and the UI must never pretend otherwise.
 * Secure lookup works with the booking reference + private access link instead.
 *
 * To add OTP later (e.g. MSG91, Twilio Verify, Meta WhatsApp Cloud API):
 *  1. add provider credentials as server-only env vars,
 *  2. implement sendOtp()/verifyOtp() here (store only hashed OTPs with expiry + attempt limits in a new table),
 *  3. return true from otpConfigured() when credentials are present,
 *  4. add a /api/bookings/otp route that, after verification, returns the same safe booking view as /api/bookings/lookup.
 */
export function otpConfigured(): boolean {
  return false;
}
