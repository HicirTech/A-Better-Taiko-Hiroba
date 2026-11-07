import { describe, expect, test } from "bun:test";

import {
  altStoreSource,
  deploymentTargetOf,
  SOURCE_URL,
  usageDescriptionsOf,
} from "../scripts/altstore-source";

const FACTS = {
  appId: "com.hicirtech.taikohiroba",
  appName: "A Better Taiko Hiroba",
  version: "0.8.0",
  date: "2026-11-08T00:00:00.000Z",
  size: 4_730_767,
  notes: ["First line", "Second line"],
  privacy: { NSCameraUsageDescription: "The camera reads the QR code of a gift." },
  minOSVersion: "17.5",
};

describe("altStoreSource", () => {
  const source = altStoreSource(FACTS);
  const [app] = source.apps;
  const [latest] = app.versions;

  test("lists the release's IPA under the app's id, version and build", () => {
    expect(app.bundleIdentifier).toBe("com.hicirtech.taikohiroba");
    expect(latest).toMatchObject({ version: "0.8.0", buildVersion: "0.8.0", size: 4_730_767 });
    expect(latest.downloadURL).toBe(
      "https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases/download/v0.8.0/ABTH-0.8.0.ipa",
    );
    expect(latest.minOSVersion).toBe("17.5");
    expect(latest.localizedDescription).toBe("First line\nSecond line");
  });

  test("declares the usage descriptions it is given and no entitlements", () => {
    expect(app.appPermissions).toEqual({ entitlements: [], privacy: FACTS.privacy });
  });

  test("repeats the latest version in the keys older clients read", () => {
    expect(app).toMatchObject({
      version: latest.version,
      versionDate: latest.date,
      versionDescription: latest.localizedDescription,
      downloadURL: latest.downloadURL,
      size: latest.size,
    });
    expect(source.sourceURL).toBe(SOURCE_URL);
    expect(SOURCE_URL).toBe(
      "https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases/latest/download/altstore.json",
    );
  });

  test("takes the icon from the release's own tag", () => {
    expect(app.iconURL).toBe(
      "https://raw.githubusercontent.com/HicirTech/A-Better-Taiko-Hiroba/v0.8.0/gui/icons/app-icon.png",
    );
  });
});

describe("usageDescriptionsOf", () => {
  test("keeps only the usage descriptions, with their text unescaped", () => {
    const plist = `<dict>
	<key>CFBundleName</key>
	<string>App</string>
	<key>NSCameraUsageDescription</key>
	<string>Scans a gift&apos;s code &amp; nothing else.</string>
	<key>NSPhotoLibraryAddUsageDescription</key>
	<string>Saves a picture.</string>
</dict>`;
    expect(usageDescriptionsOf(plist)).toEqual({
      NSCameraUsageDescription: "Scans a gift's code & nothing else.",
      NSPhotoLibraryAddUsageDescription: "Saves a picture.",
    });
  });
});

describe("deploymentTargetOf", () => {
  test("gives the one target every configuration names", () => {
    const project = "IPHONEOS_DEPLOYMENT_TARGET = 17.5;\nIPHONEOS_DEPLOYMENT_TARGET = 17.5;";
    expect(deploymentTargetOf(project)).toBe("17.5");
  });

  test("refuses a project whose configurations disagree", () => {
    const project = "IPHONEOS_DEPLOYMENT_TARGET = 17.5;\nIPHONEOS_DEPLOYMENT_TARGET = 15.0;";
    expect(() => deploymentTargetOf(project)).toThrow("2 iOS deployment targets");
  });
});
