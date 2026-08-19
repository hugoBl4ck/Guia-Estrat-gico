package com.girocerto.copilot.data.local

import android.content.Context
import android.content.SharedPreferences
import com.girocerto.copilot.domain.model.VehicleProfile

class PreferencesManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("copilot_settings", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_ACTIVE_VEHICLE_ID = "active_vehicle_id"
        private const val KEY_ACTIVE_VEHICLE_NAME = "active_vehicle_name"
        private const val KEY_ACTIVE_VEHICLE_CPK = "active_vehicle_cpk"
        private const val KEY_MIN_RATE_PER_KM = "min_rate_per_km"
        private const val KEY_MIN_GROSS_PER_HOUR = "min_gross_per_hour"
        private const val KEY_IS_ELECTRIC = "is_electric"
    }

    fun saveActiveVehicle(profile: VehicleProfile) {
        prefs.edit()
            .putString(KEY_ACTIVE_VEHICLE_ID, profile.id)
            .putString(KEY_ACTIVE_VEHICLE_NAME, profile.name)
            .putFloat(KEY_ACTIVE_VEHICLE_CPK, profile.cpk.toFloat())
            .putFloat(KEY_MIN_RATE_PER_KM, profile.minRatePerKm.toFloat())
            .putFloat(KEY_MIN_GROSS_PER_HOUR, profile.minGrossPerHour.toFloat())
            .putBoolean(KEY_IS_ELECTRIC, profile.isElectric)
            .apply()
    }

    fun getActiveVehicle(): VehicleProfile {
        val id = prefs.getString(KEY_ACTIVE_VEHICLE_ID, VehicleProfile.BYD_DOLPHIN_MINI.id) ?: VehicleProfile.BYD_DOLPHIN_MINI.id
        val name = prefs.getString(KEY_ACTIVE_VEHICLE_NAME, VehicleProfile.BYD_DOLPHIN_MINI.name) ?: VehicleProfile.BYD_DOLPHIN_MINI.name
        val cpk = prefs.getFloat(KEY_ACTIVE_VEHICLE_CPK, VehicleProfile.BYD_DOLPHIN_MINI.cpk.toFloat()).toDouble()
        val minRate = prefs.getFloat(KEY_MIN_RATE_PER_KM, 2.20f).toDouble()
        val minHour = prefs.getFloat(KEY_MIN_GROSS_PER_HOUR, 40.0f).toDouble()
        val isElectric = prefs.getBoolean(KEY_IS_ELECTRIC, true)

        return VehicleProfile(
            id = id,
            name = name,
            cpk = cpk,
            isElectric = isElectric,
            minRatePerKm = minRate,
            minGrossPerHour = minHour
        )
    }

    fun updateCpk(cpk: Double) {
        prefs.edit().putFloat(KEY_ACTIVE_VEHICLE_CPK, cpk.toFloat()).apply()
    }

    fun updateTargets(minRate: Double, minHour: Double) {
        prefs.edit()
            .putFloat(KEY_MIN_RATE_PER_KM, minRate.toFloat())
            .putFloat(KEY_MIN_GROSS_PER_HOUR, minHour.toFloat())
            .apply()
    }
}
