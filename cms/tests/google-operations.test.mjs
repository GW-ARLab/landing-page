import test from "node:test";
import assert from "node:assert/strict";
import { syncOperationsToGoogle } from "../google.mjs";

test("đồng bộ nhật ký giữ header khi tab rỗng và xóa dòng cũ", async () => {
  const previous = process.env.ARL_OPERATIONS_SHEET_ID;
  process.env.ARL_OPERATIONS_SHEET_ID = "staging-operations";
  const writes = [];
  const request = async (url, options) => {
    if (!options) {
      const tab = decodeURIComponent(url).match(/\/values\/([^/]+)!A:A$/)?.[1];
      return { json: async () => ({ values: tab === "Jobs" ? [["id"], ["old-job"]] : [["id"]] }) };
    }
    writes.push({ url, body: JSON.parse(options.body) });
    return { json: async () => ({}) };
  };
  try {
    await syncOperationsToGoogle({
      Jobs: [],
      Validation_Errors: [{ id: "error-1", job_id: "job-1", tab: "Products", record_id: "P_1", field: "name_vi", message: "Lỗi thử" }],
      Releases: [],
      Audit_Events: [],
    }, request);
  } finally {
    if (previous === undefined) delete process.env.ARL_OPERATIONS_SHEET_ID;
    else process.env.ARL_OPERATIONS_SHEET_ID = previous;
  }
  assert.equal(writes.length, 2);
  assert.match(writes[0].url, /values:batchUpdate$/);
  assert.deepEqual(writes[0].body.data[0], {
    range: "Jobs!A1:G1",
    values: [["id", "kind", "state", "actor", "error", "created_at", "updated_at"]],
  });
  assert.deepEqual(writes[0].body.data[1], {
    range: "Validation_Errors!A1:F2",
    values: [
      ["id", "job_id", "tab", "record_id", "field", "message"],
      ["error-1", "job-1", "Products", "P_1", "name_vi", "Lỗi thử"],
    ],
  });
  assert.match(writes[1].url, /values:batchClear$/);
  assert.deepEqual(writes[1].body.ranges, ["Jobs!A2:G2"]);
});
