import { describe, expect, test } from "bun:test";

import { DEV_ADDRESS, mockAddressOf, mockOrigins } from "../scripts/mock-origins";

const DEV_HIROBA = "http://hiroba.127.0.0.1.sslip.io:8807";

describe("the stand-in's addresses", () => {
  test("point the dev run's app at the stand-in on 8807 and 8808, third parties too", () => {
    expect(mockOrigins(DEV_ADDRESS).appEnvironment).toEqual({
      ABTH_DEV_HIROBA_ORIGIN: DEV_HIROBA,
      ABTH_DEV_IDP_HOST: "id.127.0.0.1.sslip.io:8808",
      ABTH_DEV_IMG_ORIGIN: "http://img.127.0.0.1.sslip.io:8807",
      ABTH_DEV_REFUSING_HOST: "refuses.127.0.0.1.sslip.io:8808",
      ABTH_DEV_CHART_ORIGIN: DEV_HIROBA,
      ABTH_DEV_SONG_CATALOGUE: `${DEV_HIROBA}/__song-catalogue`,
      ABTH_DEV_CHINESE_NAMES: `${DEV_HIROBA}/__chinese-names`,
      ABTH_DEV_RATING_DATA: `${DEV_HIROBA}/__rating-data`,
      ABTH_DEV_RATING_DATA_V2: `${DEV_HIROBA}/__rating-data-v2`,
      ABTH_DEV_ESE_MAPPING: `${DEV_HIROBA}/__ese-mapping`,
      ABTH_DEV_ESE_CHARTS: `${DEV_HIROBA}/__ese/`,
      ABTH_DEV_ABTH_CDN: `${DEV_HIROBA}/__abth-cdn/`,
    });
  });

  test("start a stand-in where its own variables say, the dev run's address by default", () => {
    const onTheLan = { ip: "192.168.0.2", hirobaPort: 8917, idpPort: 8918 };
    const origins = mockOrigins(onTheLan);

    expect(mockAddressOf({})).toEqual(DEV_ADDRESS);
    expect(mockAddressOf(origins.mockEnvironment)).toEqual(onTheLan);
    expect(origins.appEnvironment.ABTH_DEV_IDP_HOST).toBe("id.192.168.0.2.sslip.io:8918");
  });
});
