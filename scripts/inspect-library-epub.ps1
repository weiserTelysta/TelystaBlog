param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Output
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$root = (Get-Item -LiteralPath $Source).FullName.TrimEnd('\')
$results = @()
function Read-ZipXml($zip, [string]$entryPath) {
    $entry = $zip.GetEntry($entryPath)
    if ($null -eq $entry -or $entry.Length -gt 4194304) { throw "Missing or oversized XML: $entryPath" }
    $settings = New-Object System.Xml.XmlReaderSettings
    $settings.DtdProcessing = [System.Xml.DtdProcessing]::Ignore
    $settings.XmlResolver = $null
    $stream = $entry.Open()
    $reader = [System.Xml.XmlReader]::Create($stream, $settings)
    try { $doc = New-Object System.Xml.XmlDocument; $doc.XmlResolver = $null; $doc.Load($reader); return ,$doc }
    finally { $reader.Dispose(); $stream.Dispose() }
}
foreach ($file in Get-ChildItem -LiteralPath $root -File -Recurse -Filter '*.epub') {
    $record = [ordered]@{ path = $file.FullName.Substring($root.Length + 1).Replace('\','/'); title = ''; authors = @(); language = ''; publisher = ''; error = $null }
    $zip = $null
    $stream = $null
    try {
        $stream = [System.IO.File]::OpenRead('\\?\' + $file.FullName)
        $zip = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Read, $false)
        $container = Read-ZipXml $zip 'META-INF/container.xml'
        $opfPath = $container.SelectSingleNode("//*[local-name()='rootfile']/@full-path").Value
        $opf = Read-ZipXml $zip $opfPath
        $metadata = $opf.SelectSingleNode("//*[local-name()='metadata']")
        $title = $metadata.SelectSingleNode("*[local-name()='title']")
        if ($null -ne $title) { $record.title = $title.InnerText.Trim() }
        $record.authors = @($metadata.SelectNodes("*[local-name()='creator']") | ForEach-Object { $_.InnerText.Trim() } | Where-Object { $_ })
        foreach ($field in @('language','publisher')) {
            $node = $metadata.SelectSingleNode("*[local-name()='$field']")
            if ($null -ne $node) { $record[$field] = $node.InnerText.Trim() }
        }
    } catch { $record.error = $_.Exception.Message }
    finally { if ($null -ne $zip) { $zip.Dispose() } elseif ($null -ne $stream) { $stream.Dispose() } }
    $results += [pscustomobject]$record
}
$results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $Output -Encoding UTF8
[pscustomobject]@{ inspected = $results.Count; errors = @($results | Where-Object { $_.error }).Count; withAuthors = @($results | Where-Object { $_.authors.Count -gt 0 }).Count } | ConvertTo-Json -Compress
