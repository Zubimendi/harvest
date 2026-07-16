import { Alert } from 'react-native';
import { CombinedGraphQLErrors } from '@apollo/client/errors';

/** Prefer GraphQL error messages over Apollo's generic wrapper. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback;

  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message || error.message || fallback;
  }

  if (typeof error === 'object' && error !== null) {
    const maybe = error as {
      graphQLErrors?: { message?: string }[];
      networkError?: { message?: string };
      message?: string;
    };
    if (maybe.graphQLErrors?.[0]?.message) return maybe.graphQLErrors[0].message;
    if (maybe.networkError?.message) return maybe.networkError.message;
    if (maybe.message) {
      return maybe.message.replace(/^ApolloError:\s*/i, '');
    }
  }

  if (error instanceof Error && error.message) {
    return error.message.replace(/^ApolloError:\s*/i, '');
  }

  if (typeof error === 'string') return error;
  return fallback;
}

export function showErrorAlert(title: string, error: unknown, fallback?: string) {
  Alert.alert(title, getErrorMessage(error, fallback));
}

export function showSuccessAlert(title: string, message: string) {
  Alert.alert(title, message);
}
