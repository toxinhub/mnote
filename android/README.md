# m}note Android companion

This is a free Android companion for the existing m}note GitHub Pages app. The existing website, Supabase data, admin authentication and approval workflow remain separate and unchanged.

## Included
- Opens the existing m}note website inside Android WebView.
- Uses a narrow JavaScript bridge for permitted direct audio URLs.
- Plays those files through AndroidX Media3 in a MediaSessionService, allowing background and lock-screen playback where Android permits.
- Publishes track metadata and system media controls.

## Playback boundary
YouTube links continue to use the existing YouTube web player. This native service rejects YouTube, Spotify and SoundCloud page URLs. It does not extract streams, download audio or bypass platform restrictions. A YouTube iframe is not turned into a native background audio source.

The native bridge accepts HTTPS URLs ending in .mp3, .m4a, .aac, .ogg, .opus, .wav, .flac or .webm. The remote host must allow access and serve a compatible media response. The existing website playlist controls are reused for these direct files while the app is open.

## Free APK build
The repository workflow .github/workflows/android-apk.yml builds app-debug.apk using GitHub Actions. No paid service or Play Store account is required.

To build locally, open this android directory in Android Studio with JDK 17 and Android SDK 35, or install Gradle 8.9 and run:

    gradle --no-daemon assembleDebug

The APK is written to android/app/build/outputs/apk/debug/app-debug.apk.

A debug APK can be installed directly on a personal Android device. Play Store publication requires a separate release-signing and publishing process.

## CI

Every Android source change triggers the Android APK workflow. The debug APK is published as a downloadable workflow artifact after a successful build.
