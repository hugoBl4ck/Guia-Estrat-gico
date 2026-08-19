package com.girocerto.copilot.data.parser

import com.girocerto.copilot.domain.model.PlatformType
import com.girocerto.copilot.domain.repository.IOfferParser

class OfferParserFactory(
    private val uberParser: IOfferParser = UberOfferParser(),
    private val ninetyNineParser: IOfferParser = NinetyNineOfferParser(),
    private val inDriveParser: IOfferParser = InDriveOfferParser()
) {
    fun getParserForPackage(packageName: String): IOfferParser? {
        val lowerPkg = packageName.lowercase()
        return when {
            lowerPkg.contains("ubercab") || lowerPkg.contains("uber") -> uberParser
            lowerPkg.contains("taxis99") || lowerPkg.contains("didiglobal") || lowerPkg.contains("app99") || lowerPkg.contains("didi") || lowerPkg.contains("99") -> ninetyNineParser
            lowerPkg.contains("indrive") || lowerPkg.contains("indriver") -> inDriveParser
            else -> null
        }
    }

    fun getParserForPackageOrContent(packageName: String, textDump: String): IOfferParser {
        val direct = getParserForPackage(packageName)
        if (direct != null) return direct

        val lowerDump = textDump.lowercase()
        return when {
            lowerDump.contains("99pop") || lowerDump.contains("99plus") || lowerDump.contains("99moto") || lowerDump.contains("99entrega") || lowerDump.contains("99") -> ninetyNineParser
            lowerDump.contains("uberx") || lowerDump.contains("uber comfort") || lowerDump.contains("uber black") || lowerDump.contains("uber") -> uberParser
            lowerDump.contains("indrive") || lowerDump.contains("indriver") || lowerDump.contains("contraproposta") -> inDriveParser
            else -> ninetyNineParser // Fallback padrão resiliente
        }
    }

    fun getParserForPlatform(platform: PlatformType): IOfferParser {
        return when (platform) {
            PlatformType.UBER -> uberParser
            PlatformType.NINETY_NINE -> ninetyNineParser
            PlatformType.INDRIVE -> inDriveParser
            PlatformType.UNKNOWN -> uberParser
        }
    }
}
