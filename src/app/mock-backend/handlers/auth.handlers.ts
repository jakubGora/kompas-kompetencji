import type { AppUser } from '@core/domain/people.model';
import { USERS, publicUser, type SeedUser } from '../data/org';
import type { MockDb } from '../db';
import { unauthorized } from '../http';
import type { MockRouter } from '../router';
import { sessionInfo } from './session.handlers';

const PUBLIC = new Set(['POST /auth/login', 'POST /auth/logout', 'GET /auth/accounts']);
const TOKEN_PREFIX = 'mock.';

export function isPublicAuthPath(method: string, path: string): boolean {
  return PUBLIC.has(`${method.toUpperCase()} ${path}`);
}

export function userIdFromAuthorization(header: string | null | undefined): string | null {
  if (!header) return null;
  const [kind, token] = header.split(/\s+/, 2);
  if (kind?.toLowerCase() !== 'bearer' || !token?.startsWith(TOKEN_PREFIX)) return null;
  const userId = token.slice(TOKEN_PREFIX.length);
  return USERS.some((user) => user.id === userId) ? userId : null;
}

function findByLogin(login: string): SeedUser | undefined {
  const key = login.trim().toLowerCase();
  return USERS.find((user) => user.login.toLowerCase() === key);
}

function issueToken(userId: string): { token: string; expiresAt: string } {
  const expires = new Date(Date.now() + 12 * 3600_000);
  return {
    token: `${TOKEN_PREFIX}${userId}`,
    expiresAt: `${expires.toISOString().replace(/\.\d{3}Z$/, '.000Z')}`,
  };
}

export function accountHints() {
  return USERS.map((user) => ({
    login: user.login,
    fullName: user.fullName,
    jobTitle: user.jobTitle,
    roles: user.roles,
    avatarUrl: user.avatarUrl,
  }));
}

export function registerAuthRoutes(router: MockRouter): void {
  router
    .post('/auth/login', ({ db, body }) => {
      const { login, password } = (body ?? {}) as { login?: string; password?: string };
      const user = findByLogin(login ?? '');
      if (!user || user.password !== (password ?? '')) {
        throw unauthorized('Nieprawidłowy login lub hasło.');
      }
      db.update((state) => ({ ...state, sessionUserId: user.id }));
      const issued = issueToken(user.id);
      return { ...issued, user: publicUser(user) };
    })
    .post('/auth/logout', () => ({ ok: true }))
    .get('/auth/me', ({ db, user }) => sessionInfo(db, user))
    .get('/auth/accounts', () => ({ accounts: accountHints() }));
}

export function resolveMockUser(db: MockDb, authorization: string | null | undefined): AppUser {
  const userId = userIdFromAuthorization(authorization);
  if (userId) {
    if (db.state.sessionUserId !== userId) {
      db.update((state) => ({ ...state, sessionUserId: userId }));
    }
    return publicUser(db.user(userId) as SeedUser);
  }
  return publicUser(db.sessionUser() as SeedUser);
}
