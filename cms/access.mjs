const roleOrder = ["admin", "publisher", "editor", "inquiries"];

export function assignmentFor(map, identifier) {
  if (!identifier) return null;
  const enabled = roleOrder.filter(role => Array.isArray(map?.[role]) && map[role].includes(identifier));
  if (!enabled.length) return null;
  return {
    role: enabled[0],
    can_edit: enabled.includes("editor") || enabled.includes("admin"),
    can_publish: enabled.includes("publisher") || enabled.includes("admin"),
    can_read_inquiries: enabled.includes("admin") || enabled.includes("inquiries"),
  };
}

export function verifiedGoogleEmail(claims) {
  const email = String(claims?.email || "").trim().toLowerCase();
  if (!email || claims?.email_verified !== true) return null;
  // A verified Gmail address or Google Workspace hosted domain is authoritative.
  if (!email.endsWith("@gmail.com") && !claims?.hd) return null;
  return email;
}
