# Regras de Proguard para o GiroCerto Copilot Android
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable

# Suporte ao Gson e Modelos de Domínio
-keep class com.girocerto.copilot.domain.model.** { *; }
-keep class com.girocerto.copilot.data.local.entity.** { *; }
-keep class com.girocerto.copilot.data.remote.** { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
