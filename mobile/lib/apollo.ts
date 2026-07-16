import { ApolloClient, InMemoryCache, split, HttpLink, ApolloLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_SESSION_KEY, type DemoSession } from './demo';

const CACHE_KEY = 'apollo-cache-persist';
const cache = new InMemoryCache();

let authToken: string | null = null;
let tokenReady: Promise<void> | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

/** Ensure persisted demo/Supabase token is loaded before the first authenticated request. */
export function ensureAuthTokenLoaded(): Promise<void> {
  if (authToken) return Promise.resolve();
  if (tokenReady) return tokenReady;

  tokenReady = (async () => {
    try {
      const raw = await AsyncStorage.getItem(DEMO_SESSION_KEY);
      if (raw) {
        const demo = JSON.parse(raw) as DemoSession;
        if (demo?.token) authToken = demo.token;
      }
    } catch {
      // ignore
    }
  })();

  return tokenReady;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache.extract())).catch(console.error);
  }, 500);
}

AsyncStorage.getItem(CACHE_KEY)
  .then((raw) => {
    if (raw) cache.restore(JSON.parse(raw));
  })
  .catch(console.error)
  .finally(() => {
    const originalWrite = cache.write.bind(cache);
    cache.write = ((...args: Parameters<typeof cache.write>) => {
      const result = originalWrite(...args);
      schedulePersist();
      return result;
    }) as typeof cache.write;
  });

// Warm token from storage at module load
void ensureAuthTokenLoaded();

const httpLink = new HttpLink({
  uri: process.env.EXPO_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/query',
});

const authLink = new SetContextLink(async (prevContext) => {
  await ensureAuthTokenLoaded();
  return {
    headers: {
      ...prevContext.headers,
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
    },
  };
});

const errorLink = new ErrorLink(({ error, operation }) => {
  if (CombinedGraphQLErrors.is(error)) {
    error.errors.forEach((err) => {
      console.warn(`[GraphQL] ${operation.operationName}:`, err.message);
    });
  } else {
    console.warn(`[Network] ${operation.operationName}:`, error);
  }
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: process.env.EXPO_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:8080/query',
    lazy: true,
    retryAttempts: 2,
    connectionParams: () => (authToken ? { authorization: `Bearer ${authToken}` } : {}),
  }),
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  ApolloLink.from([errorLink, authLink, httpLink]),
);

export const client = new ApolloClient({
  link: splitLink,
  cache,
});
