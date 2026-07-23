$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$secretDir = Join-Path $repoRoot ".secrets"
$pgpassPath = Join-Path $secretDir "staging.pgpass"

New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
if (Test-Path -LiteralPath $pgpassPath) {
    icacls.exe $pgpassPath /grant:r "$env:USERNAME`:M" | Out-Null
}
$securePassword = Read-Host "Digite a senha do banco Supabase staging" -AsSecureString
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
    $escapedPassword = $plainPassword.Replace("\", "\\").Replace(":", "\:")
    $entry = "db.wwvocglvwkkypdclinnb.supabase.co:5432:postgres:postgres:$escapedPassword"
    [IO.File]::WriteAllText($pgpassPath, $entry + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
}
finally {
    if ($passwordPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
    }
    Remove-Variable plainPassword, escapedPassword -ErrorAction SilentlyContinue
}

icacls.exe $pgpassPath /inheritance:r /grant:r "$env:USERNAME`:M" | Out-Null
Write-Host "Credencial local configurada. Ela está ignorada pelo Git e não será exibida." -ForegroundColor Green
Read-Host "Pressione Enter para fechar"
