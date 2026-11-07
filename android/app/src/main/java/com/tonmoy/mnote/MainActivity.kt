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
import androidx.core.content.ContextCompat

class MainActivity : Activity() {
    private lateinit var webView: WebView

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
                return uri.scheme != "https" && uri.scheme != "http"
            }
        }
        webView.addJavascriptInterface(NativeAudioBridge(this), "MnoteNativeAudio")
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

    class NativeAudioBridge(private val activity: Activity) {
        private fun send(action: String, url: String? = null, title: String? = null, artist: String? = null): Boolean {
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

        @JavascriptInterface fun play(url: String, title: String, artist: String): Boolean = send(PlaybackService.ACTION_PLAY, url, title, artist)
        @JavascriptInterface fun pause() { send(PlaybackService.ACTION_PAUSE) }
        @JavascriptInterface fun resume(): Boolean = send(PlaybackService.ACTION_RESUME)
        @JavascriptInterface fun stop() { send(PlaybackService.ACTION_STOP) }
        @JavascriptInterface fun seekTo(positionMs: Long) { send(PlaybackService.ACTION_SEEK, title = positionMs.toString()) }
        @JavascriptInterface fun setVolume(value: Int) { send(PlaybackService.ACTION_VOLUME, title = value.coerceIn(0, 100).toString()) }
        @JavascriptInterface fun setMuted(value: Boolean) { send(PlaybackService.ACTION_MUTE, title = value.toString()) }
        @JavascriptInterface fun isMuted(): Boolean = PlaybackService.muted
        @JavascriptInterface fun getVolume(): Int = PlaybackService.volume
        @JavascriptInterface fun isPlaying(): Boolean = PlaybackService.playing
        @JavascriptInterface fun position(): Long = PlaybackService.positionMs
        @JavascriptInterface fun duration(): Long = PlaybackService.durationMs
    }
}
