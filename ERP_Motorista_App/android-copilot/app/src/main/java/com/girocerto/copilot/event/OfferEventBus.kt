package com.girocerto.copilot.event

import com.girocerto.copilot.domain.model.RideAnalysis
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

object OfferEventBus {

    private val _incomingOffers = MutableSharedFlow<RideAnalysis>(
        replay = 1,
        extraBufferCapacity = 10,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )

    val incomingOffers: SharedFlow<RideAnalysis> = _incomingOffers.asSharedFlow()

    fun emitOffer(analysis: RideAnalysis) {
        _incomingOffers.tryEmit(analysis)
    }
}
