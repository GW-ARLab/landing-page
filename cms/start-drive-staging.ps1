# Opt-in local staging for Zally My Drive media. Never changes the running CMS
# or the existing OAuth clients; the selected port must be free beforehand.
param(
  [ValidateRange(1, 65535)]
  [int]$Port = 8790,
  [string]$ContentSheetId = '1PViX2IV4_gpAVWa9U3UWejpORcUuJ9ytNAuZVFBQv54',
  [string]$DriveClientFile = 'C:\Json\ID&Key.json',
  [string]$DriveTokenFile = 'C:\Json\ARL-Drive-token.json',
  [string]$ServiceAccountFile = 'C:\Key json\aihoc-467710-d645c7e5f238.json'
)

$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$roleMapFile = Join-Path $projectDir 'cms-data\ARL_Role_Email_Map.local.json'
$stageData = Join-Path $projectDir 'cms-data\drive-staging'
$stageBackups = Join-Path $projectDir 'cms-data\drive-staging-backups'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeExe = if ($nodeCommand) { $nodeCommand.Source } else { 'C:\Program Files\nodejs\node.exe' }

foreach ($file in @($nodeExe, $DriveClientFile, $ServiceAccountFile, $roleMapFile)) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Không tìm thấy tệp cần thiết: $file" }
}
if (-not [System.IO.Path]::IsPathRooted($DriveClientFile) -or -not [System.IO.Path]::IsPathRooted($DriveTokenFile) -or $DriveClientFile -eq $DriveTokenFile) { throw 'Đường dẫn OAuth client/token phải tuyệt đối và khác nhau.' }
$client = Get-Content -LiteralPath $DriveClientFile -Raw | ConvertFrom-Json
if (-not $client.web.client_id -or -not $client.web.client_secret) { throw 'File OAuth Drive không phải Web application có Client ID/secret.' }
if ($client.web.client_id -eq '368533702412-m70lubu28llqs016qjp2g1aingjfcumb.apps.googleusercontent.com') { throw 'Client Drive phải khác client ARL CMS local đang dùng để đăng nhập.' }

$probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try { $probe.Start() }
catch { throw "Cổng $Port đang được dùng. Script không dừng hay thay đổi tiến trình hiện có." }
finally { $probe.Stop() }

New-Item -ItemType Directory -Path $stageData, $stageBackups -Force | Out-Null
$envNames = @('ARL_MODE','ARL_AUTH_MODE','ARL_CONTENT_SHEET_ID','ARL_INQUIRIES_SHEET_ID','ARL_OPERATIONS_SHEET_ID','ARL_GOOGLE_CREDENTIALS','ARL_GOOGLE_CONTENT_WRITE_ENABLED','ARL_ROLE_MAP','ARL_ROLE_EMAIL_MAP','ARL_ROLE_EMAIL_MAP_FILE','ARL_GOOGLE_CLIENT_ID','ARL_SESSION_COOKIE_NAME','ARL_SITE_URL','ARL_HOST','ARL_PORT','ARL_DATA_DIR','ARL_BACKUP_DIR','ARL_DRIVE_OAUTH_CLIENT_FILE','ARL_DRIVE_TOKEN_FILE','ARL_DRIVE_OWNER_EMAIL','ARL_DRIVE_MEDIA_WRITE_ENABLED')
$originalEnv = @{}
foreach ($name in $envNames) { $originalEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  $demoRoles = Get-Content -LiteralPath $roleMapFile -Raw | ConvertFrom-Json
  if (@($demoRoles.admin) -notcontains 'vnh2222@gmail.com') { $demoRoles.admin = @($demoRoles.admin) + 'vnh2222@gmail.com' }
  $env:ARL_MODE = 'local'
  $env:ARL_AUTH_MODE = 'google'
  $env:ARL_CONTENT_SHEET_ID = $ContentSheetId
  $env:ARL_INQUIRIES_SHEET_ID = ''
  $env:ARL_OPERATIONS_SHEET_ID = ''
  $env:ARL_GOOGLE_CREDENTIALS = $ServiceAccountFile
  $env:ARL_GOOGLE_CONTENT_WRITE_ENABLED = 'true'
  $env:ARL_ROLE_MAP = '{}'
  $env:ARL_ROLE_EMAIL_MAP = $demoRoles | ConvertTo-Json -Compress -Depth 5
  $env:ARL_ROLE_EMAIL_MAP_FILE = ''
  $env:ARL_GOOGLE_CLIENT_ID = '368533702412-m70lubu28llqs016qjp2g1aingjfcumb.apps.googleusercontent.com'
  $env:ARL_SESSION_COOKIE_NAME = 'arl_drive_staging_session'
  $env:ARL_SITE_URL = "http://localhost:$Port"
  $env:ARL_HOST = '127.0.0.1'
  $env:ARL_PORT = [string]$Port
  $env:ARL_DATA_DIR = $stageData
  $env:ARL_BACKUP_DIR = $stageBackups
  $env:ARL_DRIVE_OAUTH_CLIENT_FILE = $DriveClientFile
  $env:ARL_DRIVE_TOKEN_FILE = $DriveTokenFile
  $env:ARL_DRIVE_OWNER_EMAIL = 'zally.aihoc@gmail.com'
  $env:ARL_DRIVE_MEDIA_WRITE_ENABLED = 'true'

  Write-Host "CMS thử riêng: http://localhost:$Port/cms"
  Write-Host "Redirect URI cần thêm vào OAuth client Drive mới: http://localhost:$Port/api/drive-oauth/callback"
  Write-Host 'Chỉ bản sao Content Sheet được cấu hình; không dừng các CMS khác hoặc sửa OAuth client cũ.'
  Write-Host 'Đóng cửa sổ hoặc nhấn Ctrl+C để dừng bản thử.'
  Push-Location -LiteralPath $projectDir
  try { & $nodeExe '.\cms\server.mjs' }
  finally { Pop-Location }
} finally {
  foreach ($name in $envNames) { [Environment]::SetEnvironmentVariable($name, $originalEnv[$name], 'Process') }
}
