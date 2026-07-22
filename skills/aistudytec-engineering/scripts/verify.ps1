$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$skillRoot = Join-Path $repoRoot "skills\aistudytec-engineering"
$validator = "C:\Users\yolep\.codex\skills\.system\skill-creator\scripts\quick_validate.py"

Push-Location $repoRoot
try {
    $utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
    $textRoots = @("backend", "frontend\src", "frontend\public", "docs", "skills")
    $textExtensions = @(".py", ".js", ".css", ".html", ".md", ".json", ".yaml", ".yml", ".ps1", ".txt")
    $mojibakePattern = "Ã.|Â.|â€|�"
    foreach ($textRoot in $textRoots) {
        Get-ChildItem (Join-Path $repoRoot $textRoot) -File -Recurse |
            Where-Object { $textExtensions -contains $_.Extension } |
            ForEach-Object {
                $textFile = $_.FullName
                try {
                    $content = $utf8Strict.GetString([System.IO.File]::ReadAllBytes($textFile))
                }
                catch {
                    throw "Arquivo fora de UTF-8: $textFile"
                }
                if ($content -match $mojibakePattern) {
                    throw "Possível mojibake encontrado: $textFile"
                }
            }
    }
    python -m pytest backend/tests -q
    if ($LASTEXITCODE -ne 0) { throw "Os testes do backend falharam." }
    python $validator $skillRoot
    if ($LASTEXITCODE -ne 0) { throw "A validação da skill falhou." }
    Push-Location (Join-Path $repoRoot "frontend")
    try {
        npm.cmd test
        if ($LASTEXITCODE -ne 0) { throw "Os testes do frontend falharam." }
        npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw "O build do frontend falhou." }
    }
    finally { Pop-Location }
}
finally { Pop-Location }
