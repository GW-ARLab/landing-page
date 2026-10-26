import { assignmentFor } from "./access.mjs";

const managedRoles = ["editor", "publisher", "inquiries"];
const error = (status, message) => Object.assign(new Error(message), { status });

export function rosterEmails(map) {
  return [...new Set(["admin", ...managedRoles].flatMap(role => Array.isArray(map?.[role]) ? map[role] : []))].sort();
}

function allRosterEmails(map, database) {
  return [...new Set([...rosterEmails(map), ...database.prepare("SELECT email FROM cms_role_invites").all().map(row => row.email)])].sort();
}

export function roleForEmail(map, database, email) {
  if (!email || !allRosterEmails(map, database).includes(email)) return null;
  const override = database.prepare("SELECT editor,publisher,inquiries FROM cms_role_overrides WHERE email=?").get(email);
  if (!override) return assignmentFor(map, email);
  const effective = { admin: map.admin, ...Object.fromEntries(managedRoles.map(role => [role, override[role] ? [email] : []])) };
  return assignmentFor(effective, email);
}

export function roleRoster(map, database) {
  return allRosterEmails(map, database).map(email => {
    const override = database.prepare("SELECT editor,publisher,inquiries,version,updated_at FROM cms_role_overrides WHERE email=?").get(email);
    return {
      email,
      admin: Array.isArray(map.admin) && map.admin.includes(email),
      ...Object.fromEntries(managedRoles.map(role => [role, override ? Boolean(override[role]) : Array.isArray(map[role]) && map[role].includes(email)])),
      version: override?.version || 0,
      updated_at: override?.updated_at || null,
    };
  });
}

export function addRoleMember(map, database, input, actor) {
  const email = String(input?.email || "").trim().toLowerCase();
  const changes = { editor: input?.editor, publisher: input?.publisher, inquiries: input?.inquiries };
  if (email.length > 254 || !/^[a-z0-9][a-z0-9._%+-]{0,63}@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)) throw error(400, "Địa chỉ email không hợp lệ");
  if (Object.keys(input || {}).some(key => !["email", ...managedRoles].includes(key)) || managedRoles.some(role => typeof changes[role] !== "boolean") || !managedRoles.some(role => changes[role])) throw error(400, "Chọn ít nhất một trong ba quyền; không thể cấp quyền quản trị tại đây");
  database.exec("BEGIN IMMEDIATE");
  try {
    if (allRosterEmails(map, database).includes(email)) throw error(409, "Email đã có trong danh sách; hãy sửa quyền ở dòng hiện có");
    const at = new Date().toISOString();
    database.prepare("INSERT INTO cms_role_invites(email,created_at,actor) VALUES(?,?,?)").run(email, at, actor);
    database.prepare("INSERT INTO cms_role_overrides(email,editor,publisher,inquiries,version,updated_at,actor) VALUES(?,?,?,?,?,?,?)").run(email, Number(changes.editor), Number(changes.publisher), Number(changes.inquiries), 1, at, actor);
    database.prepare("INSERT INTO audit(actor,action,object_id,result,at) VALUES(?,?,?,?,?)").run(actor, "roles.add", email, JSON.stringify(changes), at);
    database.exec("COMMIT");
  } catch (cause) { database.exec("ROLLBACK"); throw cause; }
  return roleRoster(map, database).find(row => row.email === email);
}

export function updateRoleAssignment(map, database, email, changes, expectedVersion, actor) {
  if (!allRosterEmails(map, database).includes(email)) throw error(404, "Email không nằm trong danh sách thành viên đã duyệt");
  if (Array.isArray(map.admin) && map.admin.includes(email)) throw error(403, "Quyền của quản trị viên chỉ được thay đổi trong cấu hình server");
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw error(400, "Phiên bản phân quyền không hợp lệ");
  if (!changes || typeof changes !== "object" || Array.isArray(changes) || Object.keys(changes).length !== managedRoles.length || managedRoles.some(role => typeof changes[role] !== "boolean")) throw error(400, "Chỉ được cập nhật ba quyền biên tập, duyệt đăng và xử lý liên hệ");
  database.exec("BEGIN IMMEDIATE");
  try {
    const before = roleRoster(map, database).find(row => row.email === email);
    if (before.version !== expectedVersion) throw error(409, "Quyền đã thay đổi ở phiên khác; hãy tải lại danh sách");
    const at = new Date().toISOString();
    database.prepare("INSERT INTO cms_role_overrides(email,editor,publisher,inquiries,version,updated_at,actor) VALUES(?,?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET editor=excluded.editor,publisher=excluded.publisher,inquiries=excluded.inquiries,version=excluded.version,updated_at=excluded.updated_at,actor=excluded.actor").run(email, Number(changes.editor), Number(changes.publisher), Number(changes.inquiries), before.version + 1, at, actor);
    database.prepare("INSERT INTO audit(actor,action,object_id,result,at) VALUES(?,?,?,?,?)").run(actor, "roles.update", email, JSON.stringify({ from: Object.fromEntries(managedRoles.map(role => [role, before[role]])), to: changes }), at);
    database.exec("COMMIT");
  } catch (cause) { database.exec("ROLLBACK"); throw cause; }
  return roleRoster(map, database).find(row => row.email === email);
}
