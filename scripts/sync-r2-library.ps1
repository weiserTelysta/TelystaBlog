param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$FilesFrom,
    [string]$Remote = 'r2:telysta-library/books',
    [string]$ReportDirectory = (Join-Path $env:TEMP 'telysta-library'),
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$root = (Get-Item -LiteralPath $Source).FullName.TrimEnd('\')
New-Item -ItemType Directory -Force -Path $ReportDirectory | Out-Null
$files = @(Get-ChildItem -LiteralPath $root -File -Recurse -Force | ForEach-Object {
    [pscustomobject]@{ path=$_.FullName.Substring($root.Length+1).Replace('\','/'); bytes=$_.Length; extension=$_.Extension.ToLowerInvariant() }
})
$directories = @(Get-ChildItem -LiteralPath $root -Directory -Recurse -Force | ForEach-Object { $_.FullName.Substring($root.Length+1).Replace('\','/') })
[pscustomobject]@{ root=$root; files=$files; directories=$directories; errors=@() } | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $ReportDirectory 'inventory.json')
$filter = @('--ignore-case','--filter','+ *.{epub,pdf,mobi,azw3}','--filter','- **')
$selection = @('--files-from',$FilesFrom)
$arguments = @('copy',$root,$Remote) + $selection + @('--transfers','4','--checkers','8','--s3-upload-concurrency','4','--s3-chunk-size','16Mi','--retries','5','--stats','30s','--stats-one-line','--log-level','INFO','--log-file',(Join-Path $ReportDirectory 'upload.log'))
if (-not $Apply) { $arguments += '--dry-run' }
& rclone @arguments
if ($LASTEXITCODE -ne 0) { throw "R2 copy failed: $LASTEXITCODE" }
if ($Apply) {
    & rclone hashsum SHA256 $root @filter --output-file (Join-Path $ReportDirectory 'SHA256SUMS') --log-level ERROR
    if ($LASTEXITCODE -ne 0) { throw "Local checksum generation failed: $LASTEXITCODE" }
    & rclone check $root $Remote @selection --one-way --combined (Join-Path $ReportDirectory 'verification.txt') --log-file (Join-Path $ReportDirectory 'check.log') --log-level INFO
    if ($LASTEXITCODE -ne 0) { throw "R2 verification failed: $LASTEXITCODE" }
}
# copy/check never delete local files or remote objects; no credentials are written.
