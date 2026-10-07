# Reusable build script: Mofe Beauty Studio (debug, test-signed) APK.
# Run from the android/ directory:  powershell -ExecutionPolicy Bypass -File build-apk.ps1
# Prerequisites (one-time, see tools\setup.ps1): JDK 17, Android SDK
# (platform android-34 + build-tools 34.0.0), Gradle 8.10, SDK licenses.
$ErrorActionPreference = 'Stop'

$JavaHome = "$env:LOCALAPPDATA\mofe-android\jdk17"
$GradleHome = "$env:LOCALAPPDATA\mofe-android\gradle-8.10"
$SdkDir = "$env:LOCALAPPDATA\Android\Sdk"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutDir = Join-Path $ProjectDir 'dist'

if (-not (Test-Path "$JavaHome\bin\java.exe")) { throw "JDK 17 not found at $JavaHome (run tools\setup.ps1 first)" }
if (-not (Test-Path "$SdkDir\platforms\android-34\android.jar")) { throw "android-34 platform missing in $SdkDir" }
if (-not (Test-Path "$GradleHome\bin\gradle.bat")) { throw "Gradle not found at $GradleHome" }

$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $SdkDir
$env:ANDROID_SDK_ROOT = $SdkDir
"sdk.dir=$($SdkDir -replace '\\','/')" | Out-File -FilePath (Join-Path $ProjectDir 'local.properties') -Encoding ascii

$attempt = 0
do {
  $attempt += 1
  echo "Gradle build attempt $attempt/3 (dependency downloads resume where they stopped)..."
  & "$GradleHome\bin\gradle.bat" -p $ProjectDir assembleDebug --console=plain
  if ($LASTEXITCODE -ne 0 -and $attempt -lt 3) { Start-Sleep -Seconds 15 }
} while ($LASTEXITCODE -ne 0 -and $attempt -lt 3)
if ($LASTEXITCODE -ne 0) { throw "Gradle build failed (exit $LASTEXITCODE)" }

$apk = Join-Path $ProjectDir 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apk)) { throw "APK not produced at $apk" }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$dest = Join-Path $OutDir 'mofe-beauty-studio-test.apk'
Copy-Item $apk $dest -Force

# ---- verification with Android's own tools ----
$buildTools = "$SdkDir\build-tools\34.0.0"
& "$buildTools\apksigner.bat" verify --print-certs $dest
if ($LASTEXITCODE -ne 0) { throw "apksigner verification FAILED" }
& "$buildTools\aapt.exe" dump badging $dest | Select-String -Pattern "package:|launchable-activity:|sdkVersion|targetSdkVersion"
$hash = (Get-FileHash $dest -Algorithm SHA256).Hash
$size = (Get-Item $dest).Length
"SHA-256: $hash"
"SIZE: $size bytes ($([math]::Round($size/1KB,1)) KB)"
"APK: $dest"
