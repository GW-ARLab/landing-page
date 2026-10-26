export function oauthSiteOrigin(value, production = false) {
  if (!value) throw new Error("ARL_SITE_URL chưa được cấu hình");
  let site;
  try { site = new URL(value); }
  catch { throw new Error("ARL_SITE_URL không phải URL hợp lệ"); }
  if (site.username || site.password || site.pathname !== "/" || site.search || site.hash)
    throw new Error("ARL_SITE_URL chỉ được chứa origin, không có đường dẫn hoặc thông tin đăng nhập");
  if (production && site.protocol !== "https:")
    throw new Error("Production OAuth cần ARL_SITE_URL dùng HTTPS");
  if (production && ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname))
    throw new Error("Production OAuth cần tên miền công khai, không dùng localhost");
  if (site.protocol !== "https:" && !(site.protocol === "http:" && ["localhost", "127.0.0.1"].includes(site.hostname)))
    throw new Error("OAuth cần HTTPS hoặc HTTP trên localhost");
  return site.origin;
}
