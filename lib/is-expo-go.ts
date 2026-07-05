import Constants from "expo-constants";

/**
 * Native <MapView> only works without a Google Maps API key inside Expo Go
 * (which ships its own shared dev key). Standalone/EAS builds have no key
 * configured, so we hide the map there instead of letting it crash.
 */
export const isExpoGo = Constants.appOwnership === "expo";
