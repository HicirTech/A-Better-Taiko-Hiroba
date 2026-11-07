/** Writes release/altstore.json, the AltStore and SideStore source that lists this version's IPA. */
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import capacitor from "../capacitor.config";
import pkg from "../package.json";
import {
  notesFor,
  parseUpdateFeed,
  RELEASES_URL,
  REPOSITORY_NAME,
  REPOSITORY_URL,
} from "../src/shared/updates";
import { fail } from "./capacitor-run";

/** Where AltStore and SideStore read the source: always the newest release's copy. */
export const SOURCE_URL = `${RELEASES_URL}/latest/download/altstore.json`;

const DESCRIPTION =
  "A client-side toolkit for Donder Hiroba, the Japanese play-data site for Taiko no Tatsujin: " +
  "your scores, rating, profile, My Don and favourite songs, on your own device. " +
  "Not affiliated with Bandai Namco Entertainment.";

export interface SourceFacts {
  readonly appId: string;
  readonly appName: string;
  readonly version: string;
  readonly date: string;
  readonly size: number;
  readonly notes: readonly string[];
  readonly privacy: Readonly<Record<string, string>>;
  readonly minOSVersion: string;
}

/** The source for one release, with the keys SideStore and AltStore before 2.0 still read. */
export function altStoreSource(facts: SourceFacts) {
  const { appId, appName, version, date, size, minOSVersion } = facts;
  const downloadURL = `${RELEASES_URL}/download/v${version}/ABTH-${version}.ipa`;
  const iconURL = `https://raw.githubusercontent.com/${REPOSITORY_NAME}/v${version}/gui/icons/app-icon.png`;
  const whatsNew = facts.notes.join("\n");
  return {
    name: appName,
    identifier: `${appId}.source`,
    subtitle: "The app, updated with each release.",
    website: REPOSITORY_URL,
    sourceURL: SOURCE_URL,
    iconURL,
    nsfw: false,
    apps: [
      {
        name: appName,
        bundleIdentifier: appId,
        developerName: "HicirTech",
        subtitle: "Your Donder Hiroba play data, on your phone.",
        localizedDescription: DESCRIPTION,
        iconURL,
        category: "utilities",
        versions: [
          {
            version,
            buildVersion: version,
            date,
            localizedDescription: whatsNew,
            downloadURL,
            size,
            minOSVersion,
          },
        ],
        // AltStore refuses an app whose entitlements or usage descriptions differ from these.
        appPermissions: { entitlements: [], privacy: facts.privacy },
        version,
        versionDate: date,
        versionDescription: whatsNew,
        downloadURL,
        size,
      },
    ],
    news: [],
  } as const;
}

const XML_ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

/** Every `NS…UsageDescription` key of an Info.plist, with its text. */
export function usageDescriptionsOf(plist: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, key, text] of plist.matchAll(
    /<key>(NS\w+UsageDescription)<\/key>\s*<string>([^<]*)<\/string>/g,
  )) {
    if (key !== undefined && text !== undefined) {
      found[key] = text.replace(/&\w+;/g, (entity) => XML_ENTITIES[entity] ?? entity);
    }
  }
  return found;
}

/** The iOS version an Xcode project builds for; every configuration must name the same one. */
export function deploymentTargetOf(project: string): string {
  const targets = [
    ...new Set(
      [...project.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = ([\d.]+);/g)].map((match) => match[1]),
    ),
  ];
  const [target] = targets;
  if (targets.length !== 1 || target === undefined) {
    throw new Error(
      `The project names ${targets.length} iOS deployment targets, and must name one.`,
    );
  }
  return target;
}

if (import.meta.main) {
  const gui = join(import.meta.dir, "..");
  const feed = parseUpdateFeed(readFileSync(join(gui, "update.json"), "utf8"));
  if (!feed.ok) {
    fail(`gui/update.json: ${feed.error}`);
  }
  const { appId, appName } = capacitor;
  if (appId === undefined || appName === undefined) {
    fail("capacitor.config.ts names no appId or appName.");
  }
  const ios = join(gui, "ios", "App");
  const source = altStoreSource({
    appId,
    appName,
    version: pkg.version,
    date: new Date().toISOString(),
    size: statSync(join(gui, "release", `ABTH-${pkg.version}.ipa`)).size,
    notes: notesFor(feed.value, "en"),
    privacy: usageDescriptionsOf(readFileSync(join(ios, "App", "Info.plist"), "utf8")),
    minOSVersion: deploymentTargetOf(
      readFileSync(join(ios, "App.xcodeproj", "project.pbxproj"), "utf8"),
    ),
  });
  writeFileSync(join(gui, "release", "altstore.json"), `${JSON.stringify(source, null, 2)}\n`);
}
