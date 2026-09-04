param(
	[Parameter(Mandatory = $true)]
	[string]$Source,

	[string]$Remote = 'r2:telysta-blog-assets/telysta-images',

	[switch]$Apply
)

$resolvedSource = (Resolve-Path -LiteralPath $Source -ErrorAction Stop).Path
if (-not (Test-Path -LiteralPath $resolvedSource -PathType Container)) {
	throw "CDN 素材目录不存在：$resolvedSource"
}

$rcloneArguments = @(
	'copy',
	$resolvedSource,
	$Remote,
	'--exclude', '*.ps1',
	'--exclude', '*.bat',
	'--exclude', '*.cmd',
	'--exclude', '.DS_Store',
	'--exclude', 'Thumbs.db',
	'--transfers', '8',
	'--checkers', '16',
	'--progress'
)

if (-not $Apply) {
	$rcloneArguments += '--dry-run'
	Write-Host 'Dry run: no files will be uploaded or deleted. Add -Apply after reviewing the result.'
}

& rclone @rcloneArguments
if ($LASTEXITCODE -ne 0) {
	exit $LASTEXITCODE
}

if ($Apply) {
	Write-Host "R2 upload completed: $Remote"
}
