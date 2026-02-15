$path = 'twa-manifest.json'
$content = Get-Content $path -Raw
if ($content -match '"appVersionCode":\s*(\d+)') {
    $oldCode = $Matches[1]
    Copy-Item $path android/twa-manifest.json -Force
    if (Test-Path 'android/android-keystore.jks') {
        # Ensure path is relative to android directory when inside it
        (Get-Content android/twa-manifest.json).Replace('./android/android-keystore.jks', './android-keystore.jks') | Set-Content android/twa-manifest.json
    }
    Push-Location android
    bubblewrap update --yes
    Pop-Location
    if (Test-Path 'android/app/build.gradle') {
        $gradleContent = Get-Content android/app/build.gradle -Raw
        $gradleContent = $gradleContent -replace 'VERSION_1_8', 'VERSION_17'
        
        if ($gradleContent -notmatch 'signingConfigs') {
            $signingLogic = "def env = [:]`nif (file(`"../.env.local`").exists()) {`n    file(`"../.env.local`").eachLine { line ->`n        if (line.contains(`"=`")) {`n            def parts = line.split(`"=`", 2)`n            env[parts[0]] = parts[1]`n        }`n    }`n}`n`nandroid {`n    signingConfigs {`n        release {`n            storeFile file(`"../android-keystore.jks`")`n            storePassword env.ANDROID_KEY_STORE_PASSWORD ?: System.getenv(`"ANDROID_KEY_STORE_PASSWORD`")`n            keyAlias `"android`"`n            keyPassword env.ANDROID_KEY_PASSWORD ?: System.getenv(`"ANDROID_KEY_PASSWORD`")`n        }`n    }"
            $gradleContent = $gradleContent -replace 'android \{', $signingLogic
            $gradleContent = $gradleContent -replace 'release \{(\s+)minifyEnabled true', "release {`$1minifyEnabled true`n`$1signingConfig signingConfigs.release"
        }
        $gradleContent | Set-Content android/app/build.gradle -NoNewline
    }
    if (Test-Path 'android/app/src/main/AndroidManifest.xml') {
        $manifestContent = Get-Content android/app/src/main/AndroidManifest.xml -Raw
        $manifestContent -replace 'package="[^"]*"', '' | Set-Content android/app/src/main/AndroidManifest.xml
    }
    Copy-Item android/twa-manifest.json $path -Force
    (Get-Content $path -Raw) -replace '"appVersionCode":\s*\d+', ('"appVersionCode": ' + $oldCode) | Set-Content $path -NoNewline
    Write-Host 'Restored versionCode to' $oldCode
}
