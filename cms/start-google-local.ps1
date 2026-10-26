# Run an isolated local Google Sign-In demo without touching the CMS on port 8787.
param(
  [ValidateRange(1, 65535)]
  [int]$Port = 8790,
  [switch]$GrantVnhAdminForTest,
  [switch]$ReuseLatestDemo
)

$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$sourceFile = Join-Path $PSScriptRoot 'local\ARL_Content.json'
$roleMapFile = Join-Path $projectDir 'cms-data\ARL_Role_Email_Map.local.json'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeExe = if ($nodeCommand) { $nodeCommand.Source } else { 'C:\Program Files\nodejs\node.exe' }

if (-not (Test-Path -LiteralPath $nodeExe -PathType Leaf)) { throw 'Không tìm thấy Node.js. Hãy cài Node.js rồi thử lại.' }
if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) { throw "Không tìm thấy tệp nội dung: $sourceFile" }
if (-not (Test-Path -LiteralPath $roleMapFile -PathType Leaf)) { throw "Không tìm thấy danh sách quyền: $roleMapFile" }

$probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try { $probe.Start() }
catch { throw "Cổng $Port đang được sử dụng hoặc không thể mở. Hãy dừng riêng bản thử trên cổng này trước khi chạy lại." }
finally { $probe.Stop() }

if ($ReuseLatestDemo) {
  $latestDemo = Get-ChildItem -LiteralPath (Join-Path $projectDir 'cms-data') -Directory -Filter 'google-login-demo-*' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latestDemo -or -not (Test-Path -LiteralPath (Join-Path $latestDemo.FullName 'ARL_Content.json') -PathType Leaf)) {
    throw 'Không tìm thấy dữ liệu Google-login demo trước đó để dùng lại.'
  }
  $demoRoot = $latestDemo.FullName
} else {
  $demoRoot = Join-Path $projectDir ('cms-data\google-login-demo-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
  New-Item -ItemType Directory -Path $demoRoot -ErrorAction Stop | Out-Null
  Copy-Item -LiteralPath $sourceFile -Destination (Join-Path $demoRoot 'ARL_Content.json') -ErrorAction Stop
  $existingMedia = Join-Path $projectDir 'cms-data\media'
  if (Test-Path -LiteralPath $existingMedia -PathType Container) {
    Copy-Item -LiteralPath $existingMedia -Destination (Join-Path $demoRoot 'media') -Recurse -ErrorAction Stop
  }
}

$envNames = @(
  'ARL_MODE', 'ARL_AUTH_MODE', 'ARL_CONTENT_SHEET_ID', 'ARL_INQUIRIES_SHEET_ID',
  'ARL_OPERATIONS_SHEET_ID', 'ARL_GOOGLE_CREDENTIALS', 'ARL_GOOGLE_CONTENT_WRITE_ENABLED', 'ARL_ROLE_MAP',
  'ARL_ROLE_EMAIL_MAP', 'ARL_ROLE_EMAIL_MAP_FILE', 'ARL_GOOGLE_CLIENT_ID',
  'ARL_SESSION_COOKIE_NAME', 'ARL_SITE_URL', 'ARL_HOST', 'ARL_PORT',
  'ARL_DATA_DIR', 'ARL_LOCAL_CONTENT_PATH', 'ARL_LOCAL_MEDIA_DIR', 'ARL_BACKUP_DIR'
)
$originalEnv = @{}
foreach ($name in $envNames) { $originalEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
$env:ARL_MODE = 'local'
$env:ARL_AUTH_MODE = 'google'
$env:ARL_CONTENT_SHEET_ID = ''
$env:ARL_INQUIRIES_SHEET_ID = ''
$env:ARL_OPERATIONS_SHEET_ID = ''
$env:ARL_GOOGLE_CREDENTIALS = ''
$env:ARL_GOOGLE_CONTENT_WRITE_ENABLED = ''
$env:ARL_ROLE_MAP = '{}'
if ($GrantVnhAdminForTest) {
  $demoRoles = Get-Content -LiteralPath $roleMapFile -Raw | ConvertFrom-Json
  foreach ($roleName in @('admin', 'publisher', 'inquiries')) {
    if (@($demoRoles.$roleName) -notcontains 'vnh2222@gmail.com') {
      $demoRoles.$roleName = @($demoRoles.$roleName) + 'vnh2222@gmail.com'
    }
  }
  $env:ARL_ROLE_EMAIL_MAP = $demoRoles | ConvertTo-Json -Compress -Depth 5
  $env:ARL_ROLE_EMAIL_MAP_FILE = ''
  Write-Host 'CHỈ BẢN THỬ: vnh2222@gmail.com có quyền tương đương Danh trong phiên này.'
} else {
  $env:ARL_ROLE_EMAIL_MAP = '{}'
  $env:ARL_ROLE_EMAIL_MAP_FILE = $roleMapFile
}
$env:ARL_GOOGLE_CLIENT_ID = '368533702412-m70lubu28llqs016qjp2g1aingjfcumb.apps.googleusercontent.com'
$env:ARL_SESSION_COOKIE_NAME = 'arl_google_demo_session'
$env:ARL_SITE_URL = "http://localhost:$Port"
$env:ARL_HOST = '127.0.0.1'
$env:ARL_PORT = [string]$Port
$env:ARL_DATA_DIR = Join-Path $demoRoot 'state'
$env:ARL_LOCAL_CONTENT_PATH = Join-Path $demoRoot 'ARL_Content.json'
$env:ARL_LOCAL_MEDIA_DIR = Join-Path $demoRoot 'media'
$env:ARL_BACKUP_DIR = Join-Path $demoRoot 'backups'

Write-Host "Bản thử riêng: http://localhost:$Port/cms"
Write-Host "Dữ liệu thử riêng: $demoRoot"
Write-Host "OAuth client ARL phải có Authorized JavaScript origin http://localhost:$Port"
Write-Host 'Đóng cửa sổ này hoặc nhấn Ctrl+C để dừng bản thử; cổng 8787 không bị tác động.'
Push-Location -LiteralPath $projectDir
try { & $nodeExe '.\cms\server.mjs' }
finally { Pop-Location }
} finally {
  foreach ($name in $envNames) { [Environment]::SetEnvironmentVariable($name, $originalEnv[$name], 'Process') }
}
