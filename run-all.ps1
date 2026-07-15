$containerName = "my-postgres"
$databaseName = "rafc"
$postgresUser = "postgres"
$postgresPassword = "local_postgres_password"
$databaseUrl = "postgresql://$postgresUser`:$postgresPassword@localhost:5432/$databaseName`?schema=public"

function Write-Step {
    param([string]$Message)
    Write-Host "[run-all] $Message"
}

Write-Step "Checking whether PostgreSQL container '$containerName' exists..."
$existingContainer = docker ps -a --filter "name=^/$containerName$" --format "{{.Names}}"
if ($existingContainer -eq $containerName) {
    Write-Step "Container exists. Starting '$containerName'..."
    docker start $containerName
}
else {
    Write-Step "Container not found. Creating '$containerName' from postgres image..."
    docker run --name $containerName `
        -e POSTGRES_USER=$postgresUser `
        -e POSTGRES_PASSWORD=$postgresPassword `
        -e POSTGRES_DB=$databaseName `
        -p 5432:5432 `
        -v pgdata:/var/lib/postgresql/data `
        --restart unless-stopped `
        -d postgres
}

Write-Step "Applying PostgreSQL password to ensure the local database user matches the app configuration..."
docker exec $containerName psql -U $postgresUser -d postgres -c "ALTER USER $postgresUser WITH PASSWORD '$postgresPassword';"

Write-Step "Checking whether database '$databaseName' exists..."
$existingDatabase = docker exec $containerName psql -U $postgresUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE database name = '$databaseName'"
if ($existingDatabase -ne "1") {
    Write-Step "Database '$databaseName' is missing. Creating it..."
    docker exec $containerName createdb -U $postgresUser $databaseName
}
else {
    Write-Step "Database '$databaseName' already exists."
}

Write-Step "Setting DATABASE_URL for the backend process..."
$env:DATABASE_URL = $databaseUrl
Set-Location "$PSScriptRoot\backend\src"
Write-Step "Launching backend from backend/src/index.js..."
$backendProcess = Start-Process node -ArgumentList "index.js" -PassThru -NoNewWindow
Write-Step "Backend PID: $($backendProcess.Id)"
Wait-Process -Id $backendProcess.Id
Write-Step "Backend exited. Returning to repo root..."
Set-Location $PSScriptRoot
