/** Demo neighbor — must match backend/migrations/0002_seed.sql */
export const DEMO_USER_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_DISPLAY_NAME = 'Alex Neighbor';

const DEMO_SESSION_KEY = 'harvest_demo_session';

export type DemoSession = {
  userId: string;
  displayName: string;
  token: string;
};

/** Minimal JWT for backend ParseUnverified (secret unset) or HS256 verify. */
export function createDemoToken(userId: string): string {
  const b64url = (obj: object) => {
    const json = JSON.stringify(obj);
    // Avoid Buffer for Hermes; use global btoa when available
    const raw =
      typeof btoa !== 'undefined'
        ? btoa(json)
        : // eslint-disable-next-line no-undef
          Buffer.from(json, 'utf8').toString('base64');
    return raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: userId })}.demo`;
}

export { DEMO_SESSION_KEY };
