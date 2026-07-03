import * as LocalAuthentication from "expo-local-authentication";

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function authenticateWithBiometrics(): Promise<{ success: boolean; error?: string }> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Log in to DigitalDance",
    // Let the OS fall back to the device passcode when Face ID/Touch ID can't be
    // evaluated (e.g. Expo Go doesn't bundle NSFaceIDUsageDescription, so Face ID
    // itself can't run there). In a real build Face ID is tried first.
    disableDeviceFallback: false,
  });
  return result.success ? { success: true } : { success: false, error: result.error };
}
