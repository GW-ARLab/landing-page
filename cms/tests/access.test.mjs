import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assignmentFor, verifiedGoogleEmail } from "../access.mjs";

test("Danh và Hiếu giữ quyền quản trị trong cấu hình được duyệt", () => {
  const map = JSON.parse(readFileSync(new URL("../../cms-data/ARL_Role_Email_Map.local.json", import.meta.url), "utf8"));
  for (const email of ["danhphan141204@gmail.com", "vnh2222@gmail.com"]) {
    assert.deepEqual(assignmentFor(map, email), { role: "admin", can_edit: true, can_publish: true, can_read_inquiries: true });
  }
});

test("phân quyền Google có thể kiêm nhiệm nhưng không cấp cho người lạ", () => {
  const assignments = { editor: ["editor@example.test", "dual@gmail.com"], publisher: ["leader@gmail.com", "dual@gmail.com"], admin: ["leader@gmail.com"], inquiries: ["leader@gmail.com"] };
  assert.deepEqual(assignmentFor(assignments, "leader@gmail.com"), { role: "admin", can_edit: true, can_publish: true, can_read_inquiries: true });
  assert.deepEqual(assignmentFor({ admin: ["admin-only@gmail.com"] }, "admin-only@gmail.com"), { role: "admin", can_edit: true, can_publish: true, can_read_inquiries: true });
  assert.deepEqual(assignmentFor(assignments, "editor@example.test"), { role: "editor", can_edit: true, can_publish: false, can_read_inquiries: false });
  assert.deepEqual(assignmentFor(assignments, "dual@gmail.com"), { role: "publisher", can_edit: true, can_publish: true, can_read_inquiries: false });
  assert.equal(assignmentFor(assignments, "stranger@gmail.com"), null);
});

test("chỉ nhận email mà Google có thể xác nhận quyền sở hữu", () => {
  assert.equal(verifiedGoogleEmail({ email: "Leader@Gmail.com", email_verified: true }), "leader@gmail.com");
  assert.equal(verifiedGoogleEmail({ email: "leader@gmail.com", email_verified: false }), null);
  assert.equal(verifiedGoogleEmail({ email: "staff@arl.example", email_verified: true }), null);
  assert.equal(verifiedGoogleEmail({ email: "staff@arl.example", email_verified: true, hd: "arl.example" }), "staff@arl.example");
});
