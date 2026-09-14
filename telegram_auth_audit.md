# Telegram Authentication Flow Audit & Analysis

## 1. Overview
The Shadow Shop Telegram integration supports two primary authentication paths:
- **Telegram Login Widget**: A standard OAuth2-like handshake using an official Telegram-hosted button.
- **Telegram Phone/OTP Flow**: A custom implementation using the Shadow Shop Telegram Bot to deliver verification codes via private message.

## 2. Telegram Login Widget Flow (Official)
This flow is used for one-click authentication for users who are already logged into Telegram in their browser.

### API Handshake
1. **Frontend**: Loads `https://telegram.org/js/telegram-widget.js`.
2. **User Action**: Clicks the "Login with Telegram" button.
3. **Authorization**: Telegram prompts the user to authorize the site.
4. **Callback**: Upon approval, Telegram executes a client-side callback with a `user` object containing:
    - `id`, `first_name`, `last_name`, `username`, `photo_url`, `auth_date`, `hash`.
5. **Backend Verification**: Frontend sends this data to `/api/auth/telegram/login/`.
    - **Security**: Backend verifies the `hash` using the `Bot Token` and HMAC-SHA256.
    - **Replay Protection**: Checks `auth_date` is within 24 hours.

## 3. Telegram Phone/OTP Flow (Custom)
This flow allows users to log in using their phone number, with the verification code delivered via the Telegram Bot.

### API Endpoints & Flow
1. **Start**: `POST /api/auth/telegram/start/`
    - **Request**: `{ "phone": "+855..." }`
    - **Response**: `{ "token": "...", "bot_link": "https://t.me/bot?start=verify_token" }`
2. **Deep Linking**: User clicks the `bot_link` which opens the Telegram app and sends `/start verify_token`.
3. **Webhook Handling**: `POST /api/auth/telegram/webhook/` (Telegram -> Backend)
    - Backend generates a 6-digit OTP.
    - Sends the OTP to the user's Telegram chat via `sendMessage` API.
4. **Polling/Status**: `GET /api/auth/telegram/status/?token=...`
    - Frontend polls to detect when the user has opened the bot and received the code.
5. **Confirmation**: `POST /api/auth/telegram/otp-login/`
    - **Request**: `{ "token": "...", "otp": "123456" }`
    - **Response**: JWT Tokens (`access`, `refresh`) and user profile.

## 4. Security & Error Handling
- **Signature Validation**: All Telegram widget data is cryptographically verified on the backend.
- **OTP Expiry**: Verification tokens expire after 10 minutes.
- **Rate Limiting**: Bot API interactions are subject to Telegram's flood limits (30 messages/second).
- **Error States**:
    - `400 Bad Request`: Invalid signature, expired OTP, or malformed phone number.
    - `404 Not Found`: Verification session not found or user not registered.

## 5. Performance Bottlenecks Identified
- **Phone Entry**: Current implementation is hardcoded to Cambodia (`0` prefix) and lacks auto-formatting.
- **Manual Navigation**: Users must manually click the bot link, then switch back to the browser.
- **Polling Latency**: The status check frequency affects the perceived responsiveness of the OTP delivery.
