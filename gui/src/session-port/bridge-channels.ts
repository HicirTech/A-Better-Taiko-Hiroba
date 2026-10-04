/** The IPC channel of each port method, shared by the Electron main process and its preload. */
export const BRIDGE_CHANNELS = {
  isSignedIn: "abth:is-signed-in",
  signIn: "abth:sign-in",
  cancelSignIn: "abth:cancel-sign-in",
  readProfile: "abth:read-profile",
  signOut: "abth:sign-out",
  openCostumeEditor: "abth:open-costume-editor",
  openTitleEditor: "abth:open-title-editor",
  previewCostume: "abth:preview-costume",
  readPicture: "abth:read-picture",
  changeCostume: "abth:change-costume",
  changeTitle: "abth:change-title",
  changeName: "abth:change-name",
  costumeHistory: "abth:costume-history",
  readUpdateFeed: "abth:read-update-feed",
} as const;
