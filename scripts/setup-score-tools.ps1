$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$toolRoot = Join-Path $projectRoot ".tmp"
$jianpuDirectory = Join-Path $toolRoot "jianpu-ly"
$lilypondArchive = Join-Path $toolRoot "lilypond-2.24.4-mingw-x86_64.zip"
$lilypondDirectory = Join-Path $toolRoot "lilypond-2.24.4"
$lilypondUrl = "https://gitlab.com/lilypond/lilypond/-/releases/v2.24.4/downloads/lilypond-2.24.4-mingw-x86_64.zip"

New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null

if (-not (Test-Path -LiteralPath $jianpuDirectory)) {
    Write-Host "Preparing jianpu-ly 1.889..."
    python -m pip install `
        --disable-pip-version-check `
        --no-warn-script-location `
        --target $jianpuDirectory `
        "jianpu-ly==1.889"
    if ($LASTEXITCODE -ne 0) {
        throw "jianpu-ly setup failed."
    }
}
else {
    Write-Host "jianpu-ly already exists; skipping."
}

if (-not (Test-Path -LiteralPath $lilypondDirectory)) {
    if (-not (Test-Path -LiteralPath $lilypondArchive)) {
        Write-Host "Downloading the LilyPond 2.24.4 portable archive..."
        Invoke-WebRequest -Uri $lilypondUrl -OutFile $lilypondArchive
    }
    Write-Host "Extracting LilyPond..."
    Expand-Archive -LiteralPath $lilypondArchive -DestinationPath $toolRoot
}
else {
    Write-Host "LilyPond already exists; skipping."
}

$lilypondExecutable = Join-Path $lilypondDirectory "bin\lilypond.exe"
if (-not (Test-Path -LiteralPath $lilypondExecutable)) {
    throw "LilyPond executable was not found: $lilypondExecutable"
}

Write-Host "Score tools are ready. Run: npm run score:render -- SCORE_ID"
