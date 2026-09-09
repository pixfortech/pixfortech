/**
 * Reserved usernames and public slugs. Anything that is, or could become, a
 * route on this site, a role name, or a word that would mislead people about
 * who they are dealing with. Shared by the server validators and the client
 * hints so the two never disagree.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // routes, current and plausible
  "admin", "portal", "api", "login", "logout", "signin", "signout", "sign-in", "sign-out", "register", "signup", "sign-up",
  "auth", "account", "accounts", "settings", "profile", "profiles", "people", "person", "team", "staff", "user", "users", "me",
  "work", "services", "service", "about", "process", "technologies", "technology", "insights", "insight", "blog", "careers", "jobs",
  "contact", "privacy", "terms", "legal", "cookies", "sitemap", "robots", "manifest", "icon", "favicon", "assets", "static", "public",
  "files", "file", "uploads", "upload", "download", "downloads", "search", "notifications", "messages", "requests", "projects", "project",
  "tasks", "task", "approvals", "clients", "client", "activity", "redirect", "verify-email", "reset-password", "forgot-password",
  "magic-link", "invite", "invites", "invitation", "join", "home", "index", "new", "edit", "delete", "create", "null", "undefined",
  "404", "500", "error", "errors", "not-found", "notfound",
  // roles and organisation words
  "super-admin", "superadmin", "root", "owner", "administrator", "moderator", "mod", "support", "help", "helpdesk", "billing",
  "security", "abuse", "postmaster", "webmaster", "hostmaster", "noreply", "no-reply", "mailer", "system", "bot", "official",
  // brand
  "pixelforge", "pixel-forge", "pixfortech", "forge", "pip", "pixel", "pixels",
]);

export const isReservedSlug = (value: string) => RESERVED_SLUGS.has(value.toLowerCase());
