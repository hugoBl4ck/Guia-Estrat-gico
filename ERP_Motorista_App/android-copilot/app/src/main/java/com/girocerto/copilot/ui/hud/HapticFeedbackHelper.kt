package com.girocerto.copilot.ui.hud

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.girocerto.copilot.domain.model.DecisionStatus

class HapticFeedbackHelper(private val context: Context) {

    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        vibratorManager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    fun vibrateForDecision(status: DecisionStatus) {
        if (vibrator == null || !vibrator.hasVibrator()) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            when (status) {
                DecisionStatus.EXCELLENT -> {
                    // Pulso duplo rápido e agradável (feedback positivo)
                    val timings = longArrayOf(0, 70, 50, 90)
                    val amplitudes = intArrayOf(0, 200, 0, 255)
                    vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
                }
                DecisionStatus.MODERATE -> {
                    // Pulso único suave
                    vibrator.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE))
                }
                DecisionStatus.REJECT -> {
                    // Pulso longo de alerta (feedback de atenção/prejuízo)
                    val timings = longArrayOf(0, 180, 80, 180)
                    val amplitudes = intArrayOf(0, 255, 0, 255)
                    vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
                }
            }
        } else {
            @Suppress("DEPRECATION")
            when (status) {
                DecisionStatus.EXCELLENT -> vibrator.vibrate(longArrayOf(0, 70, 50, 90), -1)
                DecisionStatus.MODERATE -> vibrator.vibrate(80)
                DecisionStatus.REJECT -> vibrator.vibrate(longArrayOf(0, 180, 80, 180), -1)
            }
        }
    }
}
