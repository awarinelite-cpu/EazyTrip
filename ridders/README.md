# 🛵 Ridders — Full Delivery App

React + Firebase delivery platform. Three roles: **Sender**, **Rider**, **Admin**.

---

## 📁 Project structure

```
src/
├── apps/
│   ├── sender/
│   │   ├── AuthPages.jsx          # Login, Register, Forgot Password
│   │   ├── SenderHomePage.jsx     # Dashboard + delivery history
│   │   ├── BookDeliveryPage.jsx   # 4-step booking flow
│   │   ├── TrackDeliveryPage.jsx  # Live tracking + timeline + rating
│   │   ├── WalletPage.jsx         # Top-up (Paystack) + transaction history
│   │   ├── ScheduledDelivery.jsx  # Book for a future time
│   │   └── ChatPage.jsx           # In-app messaging
│   ├── rider/
│   │   └── RiderDashboardPage.jsx # Online toggle, requests, active trip, PIN, payout
│   └── admin/
│       └── AdminApp.jsx           # Full admin panel (7 sections)
├── components/
│   ├── common/
│   │   ├── UI.jsx                 # Button, Input, Card, Modal, Toggle, Badge, Avatar…
│   │   ├── Notifications.jsx      # Bell icon, panel, full page, FCM hook
│   │   └── PromoSOS.jsx           # Promo code input + SOS button + admin create promo
│   └── maps/
│       └── RiddersMap.jsx         # Google Maps wrapper + placeholder
├── context/
│   ├── AuthContext.jsx            # Firebase Auth (all 3 roles)
│   └── DeliveryContext.jsx        # Live delivery state
├── firebase/
│   ├── config.js                  # Firebase init — paste your config here
│   ├── firestore.js               # Collection helpers + real-time listeners
│   ├── payments.js                # Paystack wallet top-up + rider payout
│   ├── chat.js                    # Real-time messaging (Firestore)
│   ├── notifications.js           # FCM push notifications
│   └── promoSOS.js                # Promo code validation + SOS alerts
└── utils/helpers.js               # Fare calculator, distance, formatting, constants
```

---

## 🚀 Setup (5 minutes)

### 1. Install
```bash
npm install
```

### 2. Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → Enable **Authentication** (Email/Password)
3. Enable **Firestore** (start in test mode)
4. Enable **Storage**
5. Enable **Cloud Messaging** (for push notifications)
6. Copy config into `src/firebase/config.js`

### 3. Create first admin
Register normally in the app, then in Firestore → `users` collection → find your document → manually set:
```json
{ "role": "admin", "isVerified": true }
```

### 4. Google Maps
1. [console.cloud.google.com](https://console.cloud.google.com) → Enable:
   - Maps JavaScript API
   - Places API
   - Directions API
2. Copy key → `src/firebase/config.js` → `GOOGLE_MAPS_API_KEY`

### 5. Paystack
1. [paystack.com](https://paystack.com) → Dashboard → API Keys
2. Copy public key → `src/firebase/payments.js` → `PAYSTACK_KEY`

### 6. FCM Push Notifications
1. Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
2. Copy VAPID key → `src/firebase/notifications.js` → `VAPID_KEY`
3. Update `public/firebase-messaging-sw.js` with your Firebase config values

### 7. Run
```bash
npm start
```

---

## 🔥 Firestore collections

| Collection      | Purpose                                    |
|-----------------|--------------------------------------------|
| `users`         | All users (sender / rider / admin)         |
| `deliveries`    | All delivery orders                        |
| `chats/{id}/messages` | Per-delivery chat messages          |
| `transactions`  | Wallet top-ups, payments, payouts          |
| `payouts`       | Rider payout requests                      |
| `notifications` | In-app + push notification records         |
| `ratings`       | Two-way sender ↔ rider ratings             |
| `sosAlerts`     | Emergency SOS alerts                       |
| `promoCodes`    | Discount codes                             |
| `appConfig`     | Admin-controlled app settings              |

---

## 🔑 Delivery status flow

```
scheduled  →  searching  →  accepted  →  pickup  →  in_transit  →  delivered
                                                                  ↘  cancelled
```

---

## 💰 Pricing & commission

| Vehicle | Base   | Per km  |
|---------|--------|---------|
| Car     | ₦500   | ₦150/km |
| Motor   | ₦300   | ₦90/km  |
| Bike    | ₦200   | ₦60/km  |

Platform commission: **15%** (adjustable in Admin → Finance)

---

## 📦 Features built

| Feature                    | File                              |
|----------------------------|-----------------------------------|
| Auth (login/register/reset)| `AuthPages.jsx`                   |
| 4-step booking flow        | `BookDeliveryPage.jsx`            |
| Live delivery tracking     | `TrackDeliveryPage.jsx`           |
| Rider matching + PIN confirm | `RiderDashboardPage.jsx`        |
| Wallet top-up (Paystack)   | `WalletPage.jsx` + `payments.js`  |
| Rider payout requests      | `WalletPage.jsx` + `payments.js`  |
| In-app chat                | `ChatPage.jsx` + `chat.js`        |
| Push notifications (FCM)   | `Notifications.jsx` + `notifications.js` |
| Scheduled delivery         | `ScheduledDelivery.jsx`           |
| Promo codes                | `PromoSOS.jsx` + `promoSOS.js`    |
| SOS emergency button       | `PromoSOS.jsx` + `promoSOS.js`    |
| Admin full control panel   | `AdminApp.jsx` (7 sections)       |
| Two-way ratings            | `TrackDeliveryPage.jsx`           |
| KYC verification           | `AdminApp.jsx` → Riders           |

---

## 🔧 Recommended Firestore indexes

Create these composite indexes in Firebase Console → Firestore → Indexes:

```
deliveries: senderId ASC, createdAt DESC
deliveries: riderId ASC, status ASC
deliveries: status ASC, createdAt DESC
notifications: userId ASC, createdAt DESC
transactions: userId ASC, createdAt DESC
```

---

## 📱 Android APK (Capacitor)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init Ridders com.ridders.app
npm run build
npx cap add android
npx cap sync
npx cap open android
```

---

## 🚢 Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```
