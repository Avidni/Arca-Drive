param(
  [Parameter(Mandatory=$true)]
  [string]$AccountId,

  [Parameter(Mandatory=$true)]
  [string]$BucketName,

  [Parameter(Mandatory=$true)]
  [string]$ApiToken,

  [string]$Origin1 = "http://localhost:3000",

  [string]$Origin2
)

$corsRules = @(
  @{
    AllowedOrigins = @($Origin1)
    AllowedMethods = @("PUT", "POST", "DELETE")
    AllowedHeaders = @("content-type", "content-length", "x-amz-checksum-crc32", "x-amz-sdk-checksum-algorithm", "x-amz-content-sha256", "authorization", "x-amz-date", "x-id")
    ExposeHeaders = @("etag")
    MaxAgeSeconds = 3600
  }
)

if ($Origin2) {
  $corsRules[0].AllowedOrigins += $Origin2
}

$body = @{
  Rules = $corsRules
} | ConvertTo-Json -Depth 10

$url = "https://api.cloudflare.com/client/v4/accounts/$AccountId/r2/buckets/$BucketName/cors"

Write-Host "Setting CORS rules for R2 bucket '$BucketName'..." -ForegroundColor Cyan

try {
  $response = Invoke-RestMethod -Uri $url -Method Put -Headers @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
  } -Body $body

  if ($response.success) {
    Write-Host "CORS rules configured successfully!" -ForegroundColor Green
  } else {
    Write-Host "Failed to configure CORS:" -ForegroundColor Red
    Write-Host ($response.errors | ConvertTo-Json)
    exit 1
  }
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 404) {
    Write-Host @"
Bucket or endpoint not found. Check your Account ID and Bucket Name.

Alternatively, configure CORS manually:
1. Go to Cloudflare Dashboard → R2 → $BucketName → Settings
2. Scroll to CORS Policy
3. Paste the following:

[
  {
    "AllowedOrigins": ["$Origin1"$(if ($Origin2) { ", `"$Origin2`"" })],
    "AllowedMethods": ["PUT", "POST", "DELETE"],
    "AllowedHeaders": ["content-type", "content-length", "x-amz-checksum-crc32", "x-amz-sdk-checksum-algorithm", "x-amz-content-sha256", "authorization", "x-amz-date", "x-id"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
"@ -ForegroundColor Yellow
  } else {
    Write-Host "Error ($statusCode): $_" -ForegroundColor Red
  }
  exit 1
}
