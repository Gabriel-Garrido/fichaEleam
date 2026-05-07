const DUPLICATE_AUTH_PATTERNS = [
  "already been registered",
  "already registered",
  "already exists",
  "duplicate",
];

export function isDuplicateAuthUserError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? "").toLowerCase();
  return DUPLICATE_AUTH_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function findAuthUserByEmail(sb: any, email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const perPage = 200;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { user: null, error };
    }

    const users = data?.users ?? [];
    const found = users.find((user: { email?: string | null }) =>
      String(user.email ?? "").trim().toLowerCase() === cleanEmail
    );
    if (found) return { user: found, error: null };
    if (users.length < perPage) break;
  }

  return { user: null, error: null };
}
