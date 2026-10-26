import test from "node:test";
import assert from "node:assert/strict";
import { oauthSiteOrigin } from "../oauth-config.mjs";

test("OAuth production chỉ chấp nhận HTTPS origin chính xác", () => {
  assert.equal(oauthSiteOrigin("https://landing-page-arl.aihoc.ai.vn", true), "https://landing-page-arl.aihoc.ai.vn");
  assert.equal(oauthSiteOrigin("http://localhost:8790"), "http://localhost:8790");
  assert.throws(() => oauthSiteOrigin("http://landing-page-arl.aihoc.ai.vn", true), /HTTPS/);
  assert.throws(() => oauthSiteOrigin("http://localhost:8790", true), /HTTPS/);
  assert.throws(() => oauthSiteOrigin("https://localhost:8790", true), /localhost/);
  assert.throws(() => oauthSiteOrigin("http://example.com"), /HTTPS/);
  assert.throws(() => oauthSiteOrigin("https://example.com/cms", true), /origin/);
  assert.throws(() => oauthSiteOrigin("https://user:pass@example.com", true), /origin/);
  assert.throws(() => oauthSiteOrigin("not a url", true), /URL/);
});
