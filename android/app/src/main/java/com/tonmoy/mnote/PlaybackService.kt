package com.tonmoy.mnote

import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

class PlaybackService : MediaSessionService() {
    private lateinit var player: ExoPlayer
    private var mediaSession: MediaSession? = null
    private val handler = Handler(Looper.getMainLooper())
    private val ticker = object : Runnable {
        override fun run() {
            if (::player.isInitialized) {
                playing = player.isPlaying
                positionMs = player.currentPosition.coerceAtLeast(0)
                durationMs = player.duration.takeIf { it > 0 } ?: 0L
            }
            handler.postDelayed(this, 500)
        }
    }

    override fun onCreate() {
        super.onCreate()
        player = ExoPlayer.Builder(this).build().apply {
            setAudioAttributes(androidx.media3.common.AudioAttributes.DEFAULT, true)
            setWakeMode(androidx.media3.common.C.WAKE_MODE_LOCAL)
            setHandleAudioBecomingNoisy(true)
            volume = if (muted) 0f else Companion.volume.coerceIn(0, 100) / 100f
            addListener(object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) { playing = isPlaying }
                override fun onPlaybackStateChanged(playbackState: Int) {
                    if (playbackState == Player.STATE_ENDED) {
                        playing = false
                        positionMs = durationMs
                    }
                }
            })
        }
        mediaSession = MediaSession.Builder(this, player).build()
        handler.post(ticker)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = mediaSession

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY -> {
                val url = intent.getStringExtra(EXTRA_URL).orEmpty()
                if (url.startsWith("https://") && isAllowedPath(url)) {
                    val metadata = MediaMetadata.Builder()
                        .setTitle(intent.getStringExtra(EXTRA_TITLE).orEmpty().ifBlank { "m}note" })
                        .setArtist(intent.getStringExtra(EXTRA_ARTIST).orEmpty())
                        .build()
                    val item = MediaItem.Builder().setUri(url).setMediaMetadata(metadata).build()
                    player.setMediaItem(item)
                    player.prepare()
                    player.play()
                }
            }
            ACTION_PAUSE -> player.pause()
            ACTION_RESUME -> player.play()
            ACTION_STOP -> {
                player.stop()
                player.clearMediaItems()
                playing = false
                positionMs = 0L
                durationMs = 0L
            }
            ACTION_SEEK -> player.seekTo(intent.getStringExtra(EXTRA_TITLE)?.toLongOrNull()?.coerceAtLeast(0L) ?: 0L)
            ACTION_VOLUME -> {
                volume = intent.getStringExtra(EXTRA_TITLE)?.toIntOrNull()?.coerceIn(0, 100) ?: volume
                player.volume = if (muted) 0f else volume / 100f
            }
            ACTION_MUTE -> {
                muted = intent.getStringExtra(EXTRA_TITLE).toBoolean()
                player.volume = if (muted) 0f else volume / 100f
            }
        }
        return START_STICKY
    }

    private fun isAllowedPath(raw: String): Boolean {
        val path = android.net.Uri.parse(raw).path.orEmpty().lowercase()
        return listOf(".mp3", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".flac", ".webm").any { path.endsWith(it) }
    }

    override fun onDestroy() {
        handler.removeCallbacks(ticker)
        if (mediaSession != null) {
            mediaSession?.release()
            mediaSession = null
        }
        if (::player.isInitialized) player.release()
        playing = false
        super.onDestroy()
    }

    companion object {
        const val ACTION_PLAY = "com.tonmoy.mnote.PLAY"
        const val ACTION_PAUSE = "com.tonmoy.mnote.PAUSE"
        const val ACTION_RESUME = "com.tonmoy.mnote.RESUME"
        const val ACTION_STOP = "com.tonmoy.mnote.STOP"
        const val ACTION_SEEK = "com.tonmoy.mnote.SEEK"
        const val ACTION_VOLUME = "com.tonmoy.mnote.VOLUME"
        const val ACTION_MUTE = "com.tonmoy.mnote.MUTE"
        const val EXTRA_URL = "url"
        const val EXTRA_TITLE = "title"
        const val EXTRA_ARTIST = "artist"
        @Volatile var playing: Boolean = false
        @Volatile var positionMs: Long = 0L
        @Volatile var durationMs: Long = 0L
        @Volatile var volume: Int = 100
        @Volatile var muted: Boolean = false
    }
}
