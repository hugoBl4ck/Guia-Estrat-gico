package com.girocerto.copilot.domain.repository

import com.girocerto.copilot.domain.model.VehicleProfile
import kotlinx.coroutines.flow.StateFlow

interface IVehicleRepository {
    val activeVehicle: StateFlow<VehicleProfile>
    suspend fun setActiveVehicle(profile: VehicleProfile)
    suspend fun updateCustomCpk(cpk: Double)
    suspend fun updateTargets(minRate: Double, minHour: Double)
    suspend fun getActiveVehicleProfile(): VehicleProfile
}
