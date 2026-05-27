# LOKLINK Capabilities & Feature Catalog

Welcome to the full LOKLINK product features inventory. Built to serve local physical trade specialists (electricians, plumbers, masons) and daily-wage hirers with a state-of-the-art modern visual interface.

---

## 🛠️ Core Capabilities

### 1. Robust Standalone Persistence Engine (`dbService.ts`)
- **Persistent Local Database**: Real-time operations (job listings, request dispatches, worker ratings, and crises broadcasts) are seamlessly mutated and saved inside `localStorage`. 
- **Universal Synchronization**: Role actions are instantly synced across profiles. A job posted as an Employer is immediately rendered inside the Worker's interactive map and incoming feeds, preserving full capability offline without backend configuration blocks.
- **Hubballi Area Testing Dataset**: Seeded with 15 verified local workers, 12 active jobs, and 3 active SOS emergency incidents spread across Hubballi neighborhoods (Vidyanagar, Deshpande Nagar, Gokul Road, Keshwapur, Old Hubballi, Navanagar, Unkal, CBT Area, Shirur Park) for realistic end-to-end sandbox evaluations.

### 2. Digital Escrow Wallet & Pay System
- **Digital Pay Wallet**: Interactive, persistent wallets built directly into the Worker and Employer user profiles.
- **Mock Funds Loader**: Employers can securely load mock funds (₹500, ₹1000, ₹5000) using premium loading actions.
- **Budget Assurance Checks**: Prevent job postings or quick hire offers unless the Employer's wallet possesses sufficient escrow balances, alerting them with premium alerts.
- **Dynamic Payout & Escrow Release**: Upon marking a job completed, funds are automatically deducted from the Employer's wallet and credited directly to the Worker's available pay balance.
- **Dynamic UPI QR Code Generation**: Worker profiles display customized payment badges featuring custom QR codes mapped to their account context to enable direct, seamless peer-to-peer visual clearing.

### 3. High-Fidelity Interactive Map Explorer (`Explore.tsx`)
- **Proximity Geolocation Radar**: Simulates interactive location accuracy circular radii, centering and flying the camera directly to user locales.
- **Role-Gated Visual Layers**: Automatically filters map markers based on user role—workers see open jobs available for claiming, and employers see proximity markers of available local specialists.
- **Persistent Map Coordinates**: Using advanced viewport monitoring, the map remembers the user's last panned center and zoom level across sessions (saved to `loklink_map_pos`), launching exactly where they left off.
- **Context-Bound Leaflet Popups**: Interactive map bubbles let daily-wage workers "Claim Jobs" instantly or employers review individual worker stats inside pristine layouts.

### 4. Smart AI Agent & Chatbot (`FloatingAIChat.tsx`)
- **Glassmorphic Voice & Text Chatbot**: Floating smart AI assistant equipped with voice synthesizers (Web Speech synthesis) and prompt comprehension to parse complex commands.
- **Conversational Action Gates**: Users can say "book a local electrician in Vidyanagar" or "post a job for a painter paying ₹1000" and the bot automatically parses the input, compiles a structural confirmation gate, and awaits the user's tap before executing local database insertion.
- **Dual-Audience Utility**: Automatically shifts persona context depending on the active user profile (assisting workers in searching jobs, and employers in posting tasks).

---

## 🎨 Premium Visual Elements & Aesthetics

### 5. High-Impact Public Marketing Homepage (`LandingPage.tsx`)
- **Pre-Login Hero Dashboard**: Beautiful marketing homepage greeting guest visitors with professional typographic statements, feature grids, responsive layouts, and interactive statistics counters.
- **Dynamic Visual Showcases**: Integrates mockup Leaflet GPS mapping visuals showing live worker routing, simulated escrow clearings, and verified safety reviews.
- **"Hire" vs "Find" Portals**: Action panels deep-link users directly to custom signup roles inside the authorization screen.

### 6. Interactive Welcoming Experience & Onboarding
- **Animated Mesh Gradients**: Welcomes users with shifting gradient backdrops (orange to deep stone colors) with floating particle bubbles.
- **Staggered Card Entries**: Implements scale entrances and micro-delays for role options, resulting in an exceptionally smooth boot sequence.
- **Google Sign-In Direct Flow**: Solves hanging popup sign-ins by caching authentication states (`loklink_auth_uid`), resolving local database user profiles, and transitioning components instantly.
- **Simulated Verification OTP**: Interactive OTP dialog accepts any simulated 6-digit credential on offline fallbacks, maintaining a functional preview stream.

### 7. Support & Platform Administration
- **Multilingual Support**: Switch configuration dynamically between English, Hindi (हिन्दी), and Kannada (ಕನ್ನಡ) on the fly, refreshing navigation labels and labels seamlessly.
- **Support Tickets System**: Submit detailed bug logs or complaints from the Settings page directly into `loklink_tickets` database collections.
- **Centralized Admin Dashboard**: Fully featured panel displaying support tickets, active db counts, system resets, and mock user management tools.

### 8. Emergency SOS Board Feed (`SOS.tsx`)
- **Emergency Crises Broadcasting**: Employers can broadcast critical trade emergencies directly to nearby specialists.
- **Incentive Resolution Pipeline**: Workers can answer SOS posts instantly. Doing so rewards the worker with a ₹50 community aid balance bonus, resolves the crisis in real-time, and clears the map marker in unified sweeps.
