package com.girocerto.copilot.data.repository

import com.girocerto.copilot.data.local.PreferencesManager
import com.girocerto.copilot.domain.model.VehicleProfile
import com.girocerto.copilot.domain.repository.IVehicleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class VehicleRepositoryImpl(
    private val preferencesManager: PreferencesManager
) : IVehicleRepository {

    private val _activeVehicle = MutableStateFlow(preferencesManager.getActiveVehicle())
    override val activeVehicle: StateFlow<VehicleProfile> = _activeVehicle.asStateFlow()

    override suspend fun setActiveVehicle(profile: VehicleProfile) {
        preferencesManager.saveActiveVehicle(profile)
        _activeVehicle.value = profile
    }

    override suspend fun updateCustomCpk(cpk: Double) {
        preferencesManager.updateCpk(cpk)
        val current = _activeVehicle.value
        _activeVehicle.value = current.copy(cpk = cpk)
    }

    override suspend fun updateTargets(minRate: Double, minHour: Double) {
        preferencesManager.updateTargets(minRate, minHour)
        val current = _activeVehicle.value
        _activeVehicle.value = current.copy(minRatePerKm = minRate, minGrossPerHour = minHour)
    }

    override suspend fun getActiveVehicleProfile(): VehicleProfile {
        return _activeVehicle.value
    }
}
