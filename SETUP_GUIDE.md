# Harvest MVP — Setup & Testing Guide

This guide walks you through configuring the external services (Supabase, Mapbox) and local environments needed to test the application in its current stage.

---

## 1. Supabase Setup (Database & Auth)

Harvest uses Supabase for its PostgreSQL database (with PostGIS for location features) and for passwordless authentication.

### Step 1.1: Create a Project
1. Go to [Supabase](https://supabase.com/) and create a free account if you don't have one.
2. Click **New Project**, select an organization, name it "Harvest", and create a strong database password. Wait for the project to provision.

### Step 1.2: Run the Database Migration
1. In your Supabase dashboard, navigate to the **SQL Editor** (the terminal icon on the left sidebar).
2. Click **New Query**.
3. Copy the entire contents of the migration file located at: `backend/migrations/0001_init.sql`
4. Paste it into the SQL Editor and click **Run**. This will create all 7 tables, ENUMs, Row Level Security (RLS) policies, and database triggers.

### Step 1.3: Enable PostGIS
*Note: PostGIS should be enabled by default in Supabase, but if the migration threw an error regarding `geography` types, ensure it's enabled:*
1. Go to **Database** (the barrel icon) -> **Extensions**.
2. Search for `postgis` and ensure it is turned ON.

### Step 1.4: Configure Authentication
1. Go to **Authentication** -> **Providers**.
2. Under "Email", ensure **Enable Email provider** is ON.
3. For testing without needing a real SMTP server right away, you can use Supabase's default email service, but be aware there is a rate limit on the free tier. 
4. Ensure **Confirm email** is enabled (this enables the OTP flow we built).

---

## 2. Mapbox Setup (Location & Maps)

Harvest uses Mapbox to render the interactive map view on the home screen.

1. Go to [Mapbox](https://www.mapbox.com/) and create a free account.
2. Navigate to your **Account Dashboard**.
3. Under **Access Tokens**, click **Create a token**.
4. Name it "Harvest Dev". Leave the default Public scopes enabled and click **Create token**.
5. Copy the generated token (it starts with `pk.eyJ...`).

---

## 3. Environment Variables

You need to create two `.env` files: one for the Go backend and one for the Expo frontend.

### Step 3.1: Backend `.env`
Create a file named `.env` inside the `backend/` directory:

```env
# backend/.env

# 1. Get this from Supabase Dashboard -> Project Settings -> Database -> Connection string (URI)
# IMPORTANT: Replace [YOUR-PASSWORD] with your actual database password
DATABASE_URL="postgres://postgres.xxxxx:YOUR-PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# 2. Get this from Supabase Dashboard -> Project Settings -> API -> JWT Settings -> JWT Secret
SUPABASE_JWT_SECRET="your-super-secret-jwt-token-from-supabase"

# The port the Go API will run on
PORT="8080"
```

### Step 3.2: Frontend `.env`
Create a file named `.env` inside the `mobile/` directory:

```env
# mobile/.env

# 1. Get this from Supabase Dashboard -> Project Settings -> API -> Project URL
EXPO_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"

# 2. Get this from Supabase Dashboard -> Project Settings -> API -> Project API keys -> anon / public
EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbG..."

# 3. Paste the Mapbox token you generated earlier
EXPO_PUBLIC_MAPBOX_TOKEN="pk.eyJ..."

# Local network URLs pointing to your Go backend. 
# NOTE: If testing on a physical device, replace 'localhost' with your computer's local IP address (e.g., 192.168.1.5)
EXPO_PUBLIC_GRAPHQL_URL="http://localhost:8080/query"
EXPO_PUBLIC_GRAPHQL_WS_URL="ws://localhost:8080/query"
```

---

## 4. Bootstrapping the Backend

Now that the keys are in place, you need to generate the GraphQL boilerplate and start the server.

1. Open a terminal and navigate to the backend:
   ```bash
   cd backend
   ```
2. Download Go dependencies:
   ```bash
   go mod tidy
   ```
3. Generate the GraphQL code based on our schema and resolvers:
   ```bash
   go run github.com/99designs/gqlgen generate
   ```
   *(Note: This creates the `model/` and `generated/` folders. Our `schema.resolvers.go` file is already written to match what this outputs).*
4. Start the server:
   ```bash
   go run ./cmd/server
   ```
   You should see output indicating the Database connected, background jobs started, and the server listening on port 8080.

---

## 5. Starting the Mobile App

With the backend running, open a **new terminal window** and start the Expo frontend.

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start --clear
   ```
4. **Testing Environment**:
   - Press **`i`** to open in the iOS Simulator (Requires Xcode on Mac).
   - Press **`a`** to open in the Android Emulator (Requires Android Studio).
   - Or, scan the QR code with the **Expo Go** app on your physical iOS/Android device. *(Remember to change `localhost` in your `mobile/.env` to your computer's local IP address if using a physical device).*

---

## 6. Recommended Testing Flow

Once the app launches:
1. **Onboarding**: Tap "Enable Location & Continue" to trigger the system location prompt.
2. **Auth**: Enter your email address. You will receive an email from Supabase with a 6-digit OTP code. Enter the code to sign in.
3. **Post a Listing**: Tap the floating `+` button. Fill out the form, add a photo, and hit publish.
4. **Map View**: Tap the map toggle in the top right to see your listing dropped on the Mapbox map.
5. **Reserve (Requires 2 accounts)**: To test the full reservation/chat loop, log out (via the Profile tab), log in with a *different* email, find the listing you just created, and tap **Reserve for Pickup**.
6. **Chat**: Once reserved, the chat screen will open. Send a message and watch the optimistic UI instantly reflect the message while it hits the Go backend.
