const admins = (process.env.DEV_MODE_ADMINS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function devAdminEmails(): string[] {
  return admins;
}

export function isDevAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return admins.includes(email.toLowerCase());
}

/** Server-side gate part 1: explicitly allowed development environment. */
export function isDevModeEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ENABLE_LOCATION_DEV_MODE === "true";
}

/** Full server-side gate: env allows it AND this user is an admin. */
export function canUseDevMode(email?: string | null): boolean {
  return isDevModeEnabled() && isDevAdminEmail(email);
}
