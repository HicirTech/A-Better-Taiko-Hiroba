/** Where ESE, the TJADB community's charts of every official song, serves its files. */
export const ESE_CHARTS_URL = "https://ese.tjadataba.se/ESE/ESE/raw/branch/master/";

const MAX_PATH_LENGTH = 300;

/** A TJA's path in ESE as part of an address, or null for one that could step out of it. */
export function eseChartPath(path: string): string | null {
  const parts = path.trim().split(/[\\/]/);
  const steps = parts.some((part) => part === "" || part === "." || part === "..");
  return path.length > MAX_PATH_LENGTH || steps || !/\.tja$/i.test(path)
    ? null
    : parts.map(encodeURIComponent).join("/");
}
