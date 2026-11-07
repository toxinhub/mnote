package com.tonmoy.mnote

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import java.util.UUID
import androidx.core.content.ContextCompat

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val bridgeToken = UUID.randomUUID().toString()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(246, 244, 239)
        window.navigationBarColor = Color.rgb(246, 244, 239)
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        webView = WebView(this)
        webView.setBackgroundColor(Color.rgb(246, 244, 239))
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                if (uri.host == "toxinhub.github.io" && uri.scheme == "https") return false
                if (uri.scheme == "https" || uri.scheme == "http") {
                    try { startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: Exception) {}
                }
                return true
            }
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view?.url?.let { Uri.parse(it).host == "toxinhub.github.io" } == true) {
                    view.evaluateJavascript("window.__MNOTE_NATIVE_TOKEN='${bridgeToken}';", null)
                }
            }
        }
        webView.addJavascriptInterface(NativeAudioBridge(this, bridgeToken), "MnoteNativeAudio")
        setContentView(webView)
        if (savedInstanceState == null) webView.loadUrl("https://toxinhub.github.io/mnote/")
        else webView.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    class NativeAudioBridge(private val activity: Activity, private val bridgeToken: String) {
        private fun authorized(token: String): Boolean = token == bridgeToken
        private fun send(token: String, action: String, url: String? = null, title: String? = null, artist: String? = null): Boolean {
            if (!authorized(token)) return false
            if (action == PlaybackService.ACTION_PLAY && !isAllowedDirectAudio(url.orEmpty())) return false
            val intent = Intent(activity, PlaybackService::class.java).setAction(action)
            if (url != null) intent.putExtra(PlaybackService.EXTRA_URL, url)
            if (title != null) intent.putExtra(PlaybackService.EXTRA_TITLE, title.take(180))
            if (artist != null) intent.putExtra(PlaybackService.EXTRA_ARTIST, artist.take(180))
            return try {
                if (action == PlaybackService.ACTION_PLAY) ContextCompat.startForegroundService(activity, intent)
                else activity.startService(intent)
                true
            } catch (_: Exception) { false }
        }

        private fun isAllowedDirectAudio(raw: String): Boolean = try {
            val uri = Uri.parse(raw)
            val host = uri.host.orEmpty().lowercase()
            val blocked = host == "youtube.com" || host.endsWith(".youtube.com") || host == "youtu.be" ||
                host == "spotify.com" || host.endsWith(".spotify.com") ||
                host == "soundcloud.com" || host.endsWith(".soundcloud.com")
            val path = uri.path.orEmpty().lowercase()
            uri.scheme == "https" && host.isNotBlank() && !blocked &&
                listOf(".mp3", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".flac", ".webm").any { path.endsWith(it) }
        } catch (_: Exception) { false }

        @JavascriptInterface fun play(token: String, url: String, title: String, artist: String): Boolean = send(token, PlaybackService.ACTION_PLAY, url, title, artist)
        @JavascriptInterface fun pause(token: String) { send(token, PlaybackService.ACTION_PAUSE) }
        @JavascriptInterface fun resume(token: String): Boolean = send(token, PlaybackService.ACTION_RESUME)
        @JavascriptInterface fun stop(token: String) { send(token, PlaybackService.ACTION_STOP) }
        @JavascriptInterface fun seekTo(token: String, positionMs: Long) { send(token, PlaybackService.ACTION_SEEK, title = positionMs.toString()) }
        @JavascriptInterface fun setVolume(token: String, value: Int) { send(token, PlaybackService.ACTION_VOLUME, title = value.coerceIn(0, 100).toString()) }
        @JavascriptInterface fun setMuted(token: String, value: Boolean) { send(token, PlaybackService.ACTION_MUTE, title = value.toString()) }
        @JavascriptInterface fun isMuted(token: String): Boolean = authorized(token) && PlaybackService.muted
        @JavascriptInterface fun getVolume(token: String): Int = if (authorized(token)) PlaybackService.volume else 0
        @JavascriptInterface fun isPlaying(token: String): Boolean = authorized(token) && PlaybackService.playing
        @JavascriptInterface fun position(token: String): Long = if (authorized(token)) PlaybackService.positionMs else 0L
        @JavascriptInterface fun duration(token: String): Long = if (authorized(token)) PlaybackService.durationMs else 0L
    }
}
