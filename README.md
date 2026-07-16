# Harvest 🌾

> Share more, waste less.

Harvest is a hyperlocal mobile app where individuals and local businesses post surplus food — free or low-cost — for pickup by nearby neighbors, within a defined time window, before it spoils or is thrown away. Think "a farmers market that only exists for the next few hours, three blocks from you."

## 📱 Features
- **Post a listing:** Quickly post surplus food with a photo, description, category, and pickup window.
- **Discover:** View a map and list of active food listings near you, filtered by distance and category.
- **Reserve & Chat:** Reserve an item and instantly chat with the poster to coordinate pickup.
- **Trust & Safety:** Profile ratings and reviews to build community trust.

## 🛠️ Tech Stack

### Mobile App (Frontend)
- React Native / Expo
- Mapbox for map rendering

### Backend API
- Go (Golang)
- GraphQL (`99designs/gqlgen`)
- Supabase (PostgreSQL + PostGIS for geospatial features)
- Supabase Auth (Passwordless Email OTP)

## 🚀 Getting Started

To run Harvest locally, you will need accounts for **Supabase** and **Mapbox**.

For detailed setup instructions, including database migrations and environment variable configuration, please refer to the full [Setup Guide](./SETUP_GUIDE.md).

### Quick Overview
1. Set up a Supabase project and run the provided SQL migrations in `backend/migrations/0001_init.sql`.
2. Obtain a Mapbox access token.
3. Configure your `.env` files for both the backend and mobile apps.
4. Start the backend:
   ```bash
   cd backend
   go run ./cmd/server
   ```
5. Start the frontend:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```

## 📚 Documentation
- [Product Requirements Document (PRD)](./Harvest-PRD.md)
- [Setup & Testing Guide](./SETUP_GUIDE.md)
- [Design System](./DESIGN_SYSTEM.md)
- [Privacy Policy](./PRIVACY_POLICY.md)
