import type { Messages } from "../types";

export const en: Messages = {
  "app.title": "A Better Taiko Hiroba",
  "signIn.intro":
    "Sign in with your Bandai Namco ID to read your Donder Hiroba profile. The sign-in page is Hiroba's own; this app never sees your password.",
  "signIn.action": "Sign in to Hiroba",
  "signIn.inProgress": "Finish signing in, including choosing your card, in the sign-in window.",
  "signIn.cancel": "Cancel sign-in",
  "signIn.closeBrowser": "Close",
  "signIn.cancelled": "Sign-in was cancelled.",
  "signIn.noSession": "Sign-in finished, but Hiroba did not start a session. Please try again.",
  "signIn.unavailable": "The sign-in window could not be opened. Please try again.",
  "signIn.refused":
    "Sign-in stopped: it was sent to {host}, which this app does not open. Please report that host name.",
  "signOut.action": "Sign out",
  "signOut.note.desktop": "This app forgets your session when you sign out or close it.",
  "signOut.note.android":
    "Sign out to end your session on this device. If you close the app instead, the session stays stored on this device until the app next opens.",
  "profile.reading": "Reading your profile from Hiroba…",
  "profile.readAgain": "Read again",
  "profile.title": "Title: {title}",
  "profile.crowns":
    "Crowns (Oni and Ura Oni): Silver {silver} · Gold {gold} · Donderful {donderful}",
  "profile.fetchedAt": "Read at {time}. Hiroba itself can be up to a day behind.",
  "failure.notSignedIn": "You are not signed in.",
  "failure.loggedOut": "Your Hiroba session has ended. Please sign in again.",
  "failure.cardSelectUnfinished":
    "Sign-in stopped before a card was chosen. Please sign in again and choose your card.",
  "failure.unreachable": "Hiroba could not be reached. Check your connection and try again.",
  "failure.timedOut": "Hiroba took too long to answer. Please try again.",
  "failure.cancelled": "The request was cancelled.",
  "failure.siteError":
    "Hiroba answered with an error. It is closed for maintenance every day from 05:00 to 07:00 JST.",
  "failure.unexpectedPage": "Hiroba answered with a page this app did not expect.",
  "failure.detail": "Details for a report: {detail}",
  "platform.unsupported": "This build runs only inside the desktop or Android app.",
};
