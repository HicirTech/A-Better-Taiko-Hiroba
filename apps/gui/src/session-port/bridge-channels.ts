/** The IPC channel of each port method, shared by the Electron main process and its preload. */
export const BRIDGE_CHANNELS = {
  isSignedIn: "abth:is-signed-in",
  signIn: "abth:sign-in",
  cancelSignIn: "abth:cancel-sign-in",
  readProfile: "abth:read-profile",
  signOut: "abth:sign-out",
} as const;
