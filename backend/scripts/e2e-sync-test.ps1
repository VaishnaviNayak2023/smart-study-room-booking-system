# End-to-end User <-> Admin synchronization tests via REST API
$ErrorActionPreference = 'Stop'
$Api = 'http://127.0.0.1:5006'
$AdminEmail = 'admin@local.test'
$AdminPassword = 'ChangeMe123!'
$UserEmail = 'user@local.test'
$UserPassword = 'ChangeMe123!'
$Tomorrow = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')

$passed = 0
$failed = 0
$testResourceId = $null

function Write-Result($ok, $name, $detail) {
  if ($ok) {
    Write-Host "PASS $name" -ForegroundColor Green
    if ($detail) { Write-Host "     $detail" -ForegroundColor DarkGray }
    $script:passed++
  } else {
    Write-Host "FAIL $name" -ForegroundColor Red
    if ($detail) { Write-Host "     $detail" -ForegroundColor Yellow }
    $script:failed++
  }
}

function Invoke-Api($Method, $Path, $Token, $Body) {
  $headers = @{ Accept = 'application/json' }
  if ($Token) { $headers.Authorization = "Bearer $Token" }
  $params = @{
    Uri = "$Api$Path"
    Method = $Method
    Headers = $headers
    TimeoutSec = 20
  }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 6)
    $params.ContentType = 'application/json'
  }
  return Invoke-RestMethod @params
}

function Login($Email, $Password, $Role) {
  return Invoke-Api POST '/api/auth/login' $null @{ email = $Email; password = $Password; role = $Role }
}

Write-Host ""
Write-Host "E2E Sync Tests - $Api"
Write-Host ("=" * 50)

$health = Invoke-RestMethod -Uri "$Api/health" -TimeoutSec 10
if ($health.status -ne 'ok') { throw 'Backend health check failed' }

$admin = Login $AdminEmail $AdminPassword 'admin'
$user = Login $UserEmail $UserPassword 'user'
$adminToken = $admin.token
$userToken = $user.token

Invoke-Api PUT '/api/settings' $adminToken @{
  systemName = 'Booking Configuration'
  currency = 'USD ($)'
  language = 'English (US)'
  maxHours = 8
  advanceDays = 30
  sameDay = $true
  autoConfirm = $false
  emailNotifications = $true
} | Out-Null

$testBookingCode = $null

# Test 1
$created = Invoke-Api POST '/api/resources' $adminToken @{
  name = "E2E Sync Room $(Get-Date -Format 'HHmmss')"
  type = 'Conference'
  capacity = 8
  location = 'Floor 2, Test Wing'
  description = 'E2E sync test resource'
  available = $true
}
$testResourceId = $created.resource.id
Write-Result ($null -ne $testResourceId) 'Test 1a - Admin creates resource' "id=$testResourceId"

$userResources = Invoke-Api GET '/api/resources' $userToken
$userSeesResource = @($userResources.resources | Where-Object { $_.id -eq $testResourceId }).Count -gt 0
Write-Result $userSeesResource 'Test 1b - User sees new resource' ''

# Test 2
$resource = (Invoke-Api GET "/api/resources/$testResourceId" $userToken).resource
$booking = Invoke-Api POST '/api/bookings' $userToken @{
  resource = $resource.name
  resourceId = $resource.id
  date = $Tomorrow
  time = '10:00'
  startTime = '10:00'
  endTime = '11:30'
  amount = '45.00'
  purpose = 'E2E sync test'
  notes = 'Automated test booking'
}
$testBookingCode = $booking.booking.id
Write-Result ($booking.booking.status -eq 'Pending') 'Test 2a - User creates booking (Pending)' "code=$testBookingCode"

$adminBookings = Invoke-Api GET '/api/bookings' $adminToken
$adminSeesBooking = @($adminBookings.bookings | Where-Object { $_.id -eq $testBookingCode }).Count -gt 0
Write-Result ($adminSeesBooking -and $adminBookings.stats.pending -ge 1) 'Test 2b - Admin sees booking + pending stats' ''

$dash = Invoke-Api GET '/api/dashboard' $adminToken
$inRecent = @($dash.bookings | Where-Object { $_.id -eq $testBookingCode }).Count -gt 0
Write-Result ($dash.stats.totalBookings -ge 1 -and $inRecent) 'Test 2c - Admin dashboard reflects booking' ''

# Test 3
$approved = Invoke-Api PUT "/api/bookings/$testBookingCode" $adminToken @{ status = 'Confirmed' }
Write-Result ($approved.booking.status -eq 'Confirmed') 'Test 3a - Admin approves booking' ''

$userBookings = Invoke-Api GET '/api/bookings/my' $userToken
$userBooking = $userBookings.bookings | Where-Object { $_.id -eq $testBookingCode } | Select-Object -First 1
$notifications = Invoke-Api GET '/api/notifications' $userToken
$hasNotif = $false
foreach ($n in $notifications.notifications) {
  if ($n.title -like '*Confirmed*' -or $n.message -like '*approved*') { $hasNotif = $true; break }
}
Write-Result (($userBooking.status -eq 'Confirmed') -and $hasNotif) 'Test 3b - User sees Confirmed + notification' ''

# Test 4
Invoke-Api PUT "/api/resources/$testResourceId" $adminToken @{ available = $false } | Out-Null
$userResources2 = Invoke-Api GET '/api/resources' $userToken
$unavailable = ($userResources2.resources | Where-Object { $_.id -eq $testResourceId }).available -eq $false
Write-Result $unavailable 'Test 4 - Admin unavailable -> User sees unavailable' ''

# Test 5
Invoke-Api PUT "/api/bookings/$testBookingCode" $adminToken @{ status = 'Cancelled' } | Out-Null
$userBookings2 = Invoke-Api GET '/api/bookings/my' $userToken
$cancelled = ($userBookings2.bookings | Where-Object { $_.id -eq $testBookingCode }).status -eq 'Cancelled'
Write-Result $cancelled 'Test 5 - Admin cancels -> User sees Cancelled' ''

# Test 6
Invoke-Api PUT "/api/resources/$testResourceId" $adminToken @{ available = $true } | Out-Null
$b2 = Invoke-Api POST '/api/bookings' $userToken @{
  resource = $resource.name
  resourceId = $resource.id
  date = $Tomorrow
  time = '14:00'
  startTime = '14:00'
  endTime = '15:00'
  amount = '30.00'
}
$code2 = $b2.booking.id
$pendingBefore = (Invoke-Api GET '/api/bookings' $adminToken).stats.pending
Invoke-Api DELETE "/api/bookings/$code2" $userToken | Out-Null
$adminAfter = Invoke-Api GET '/api/bookings' $adminToken
$gone = @($adminAfter.bookings | Where-Object { $_.id -eq $code2 }).Count -eq 0
Write-Result ($gone -and ($adminAfter.stats.pending -le $pendingBefore)) 'Test 6 - User cancel removes booking from admin view' ''

# Cleanup
if ($testResourceId) {
  Invoke-Api DELETE "/api/resources/$testResourceId" $adminToken | Out-Null
}

Write-Host ""
Write-Host ("=" * 50)
Write-Host "Results: $passed passed, $failed failed, $($passed + $failed) total"
Write-Host ""
if ($failed -gt 0) { exit 1 }
