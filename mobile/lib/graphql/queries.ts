import { gql } from '@apollo/client';

export const NEARBY_LISTINGS_QUERY = gql`
  query NearbyListings($latitude: Float!, $longitude: Float!, $radiusKm: Float!, $category: ListingCategory) {
    nearbyListings(latitude: $latitude, longitude: $longitude, radiusKm: $radiusKm, category: $category) {
      id
      title
      category
      photos
      quantity
      status
      pickupWindowEnd
      displayLocation {
        latitude
        longitude
      }
    }
  }
`;

export const LISTING_DETAIL_QUERY = gql`
  query ListingDetail($id: ID!) {
    listing(id: $id) {
      id
      title
      description
      category
      photos
      quantity
      suggestedDonation
      status
      pickupWindowStart
      pickupWindowEnd
      displayLocation {
        latitude
        longitude
      }
      trueLocation {
        latitude
        longitude
      }
      owner {
        id
        displayName
        avatarUrl
        ratingAvg
        ratingCount
      }
      reservedBy {
        id
        displayName
      }
      conversation {
        id
      }
      createdAt
    }
  }
`;

export const PUBLIC_PROFILE_QUERY = gql`
  query PublicProfile($id: ID!) {
    publicProfile(id: $id) {
      id
      displayName
      avatarUrl
      bio
      isBusiness
      ratingAvg
      ratingCount
      createdAt
    }
  }
`;

export const MY_CONVERSATIONS_QUERY = gql`
  query MyConversations {
    myConversations {
      id
      listing {
        id
        title
        status
        photos
      }
      participants {
        id
        displayName
        avatarUrl
      }
      messages {
        id
        body
        createdAt
        sender {
          id
          displayName
        }
      }
    }
  }
`;

export const CONVERSATION_MESSAGES_QUERY = gql`
  query ConversationMessages($conversationId: ID!) {
    conversationMessages(conversationId: $conversationId) {
      id
      body
      createdAt
      sender {
        id
        displayName
        avatarUrl
      }
    }
  }
`;

export const CREATE_LISTING_MUTATION = gql`
  mutation CreateListing($input: CreateListingInput!) {
    createListing(input: $input) {
      id
      status
    }
  }
`;

export const RESERVE_LISTING_MUTATION = gql`
  mutation ReserveListing($id: ID!) {
    reserveListing(id: $id) {
      id
      status
      conversation {
        id
      }
    }
  }
`;

export const CANCEL_RESERVATION_MUTATION = gql`
  mutation CancelReservation($id: ID!) {
    cancelReservation(id: $id) {
      id
      status
    }
  }
`;

export const CONFIRM_PICKUP_MUTATION = gql`
  mutation ConfirmPickup($id: ID!) {
    confirmPickup(id: $id) {
      id
      status
    }
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($conversationId: ID!, $body: String!) {
    sendMessage(conversationId: $conversationId, body: $body) {
      id
      body
      createdAt
      sender {
        id
        displayName
        avatarUrl
      }
    }
  }
`;

export const SUBMIT_REVIEW_MUTATION = gql`
  mutation SubmitReview($listingId: ID!, $rating: Int!, $comment: String) {
    submitReview(listingId: $listingId, rating: $rating, comment: $comment)
  }
`;

export const REPORT_LISTING_MUTATION = gql`
  mutation ReportListing($listingId: ID!, $reason: ReportReason!, $details: String) {
    reportListing(listingId: $listingId, reason: $reason, details: $details)
  }
`;

export const REPORT_USER_MUTATION = gql`
  mutation ReportUser($userId: ID!, $reason: ReportReason!, $details: String) {
    reportUser(userId: $userId, reason: $reason, details: $details)
  }
`;

export const LISTING_UPDATED_SUBSCRIPTION = gql`
  subscription ListingUpdated($id: ID!) {
    listingUpdated(id: $id) {
      id
      status
      reservedBy {
        id
        displayName
      }
    }
  }
`;

export const NEW_MESSAGE_SUBSCRIPTION = gql`
  subscription NewMessage($conversationId: ID!) {
    newMessage(conversationId: $conversationId) {
      id
      body
      createdAt
      sender {
        id
        displayName
        avatarUrl
      }
    }
  }
`;
