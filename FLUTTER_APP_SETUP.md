# Shadow Shop Flutter App Setup

This guide sets up a **separate Flutter mobile app** alongside the existing Shadow Shop project. The mobile app will use the existing Django REST API. It will not replace the React website or create a second backend.

## 1. Prerequisites

Install these tools on the development computer:

- Flutter SDK (stable channel)
- Android Studio, including Android SDK and platform tools
- Android emulator, or an Android phone with USB debugging enabled
- Git (optional, for source control)

After installing Flutter, open PowerShell and check the setup:

```powershell
flutter doctor
flutter --version
```

Resolve the Android toolchain issues reported by `flutter doctor`. Accept Android SDK licenses when prompted:

```powershell
flutter doctor --android-licenses
```

## 2. Create a new app folder

Choose a location next to the existing `Shadow Shop` folder. For example:

```text
C:\xampp\htdocs\Shadow Shop\       Existing Django + React project
C:\xampp\htdocs\Shadow Shop-mobile\ New Flutter project
```

Create the Flutter app from PowerShell:

```powershell
Set-Location 'C:\xampp\htdocs'
flutter create --org com.shadowshop shadow_shop_mobile
Set-Location 'C:\xampp\htdocs\shadow_shop_mobile'
```

Flutter creates the app directory using the project name `shadow_shop_mobile`. Keep this as a separate app; do not put Flutter files inside `frontend` or `backend`.

Run the starter app on a connected device or emulator:

```powershell
flutter devices
flutter run
```

## 3. Connect to the existing Django API

The API runs separately from Flutter. Start the existing Django backend using this repository's normal development setup, then configure a base URL for the Flutter app.

Use the correct host for the device running the app:

| Where Flutter runs | Development API URL example |
|---|---|
| Android emulator | `http://10.0.2.2:8001/api` |
| iOS simulator | `http://127.0.0.1:8001/api` |
| Physical phone on the same Wi-Fi | `http://YOUR_PC_LAN_IP:8001/api` |

For a physical phone, find the computer's LAN IPv4 address with:

```powershell
ipconfig
```

Use the IPv4 address for the active Wi-Fi adapter, for example `http://192.168.1.20:8001/api`. Ensure the Django development server listens on the network interface (for example, `0.0.0.0:8001`) and that Windows Firewall allows the connection. `localhost` on the phone points to the phone itself, not the development computer.

For production, use the deployed backend's **HTTPS** API URL. Do not ship an app configured to use a local IP or development server.

## 4. API and mobile app implementation

Before building screens, inspect the existing API documentation and endpoint behavior. The project documents Django REST API endpoints at `/api/docs/`, `/api/schema/`, and `/api/redoc/` when enabled. Confirm the deployed/local API base path and authentication requirements against the running backend.

Implement the mobile app in small pieces, reusing the existing API and business rules:

1. Add environment-specific API base URL configuration.
2. Implement the login/session flow and secure token storage according to the backend's actual authentication contract.
3. Add product/category browsing and product details.
4. Add cart and checkout, calling the existing order/payment endpoints.
5. Add order history, order details, and profile screens.
6. Add Khmer and English localization if needed.

Payment creation is not proof of payment. Keep payment verification and order status decisions on the backend, using its gateway callback/status flow. Do not embed secret API keys in the mobile app.

## 5. Packages to consider

Choose packages as implementation needs become clear; check their current compatibility before adding them:

- HTTP client for REST requests
- State management (such as Riverpod or Provider)
- Secure storage for authentication credentials/tokens, if the backend uses tokens
- Routing for screen navigation
- Localization for Khmer and English

Add only the packages the app actually needs:

```powershell
flutter pub add dio
```

## 6. Build an Android release

When the app is ready and configured for the production HTTPS API:

```powershell
flutter build apk --release
```

The APK is normally created at:

```text
build\app\outputs\flutter-apk\app-release.apk
```

For Google Play distribution, create an Android App Bundle instead:

```powershell
flutter build appbundle --release
```

Configure and protect a release signing key before distributing a production build. Never commit signing passwords or private keys.

## 7. iOS builds

Flutter can share most Dart code across Android and iOS, but building and signing an iOS app requires macOS with Xcode. The Windows setup above is for Android development.

## Project boundary

- Existing web app: `Shadow Shop\frontend`
- Existing API/backend: `Shadow Shop\backend`
- New Flutter app: a separate folder such as `Shadow Shop-mobile`
- API and business data: continue to come from the existing Django backend

