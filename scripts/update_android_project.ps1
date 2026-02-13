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
        (Get-Content android/app/build.gradle) -replace 'VERSION_1_8', 'VERSION_17' | Set-Content android/app/build.gradle
    }
    if (Test-Path 'android/app/src/main/AndroidManifest.xml') {
        $manifestContent = Get-Content android/app/src/main/AndroidManifest.xml -Raw
        $manifestContent -replace 'package="[^"]*"', '' | Set-Content android/app/src/main/AndroidManifest.xml
    }
    Copy-Item android/twa-manifest.json $path -Force
    (Get-Content $path -Raw) -replace '"appVersionCode":\s*\d+', ('"appVersionCode": ' + $oldCode) | Set-Content $path -NoNewline
    Write-Host 'Restored versionCode to' $oldCode
}
