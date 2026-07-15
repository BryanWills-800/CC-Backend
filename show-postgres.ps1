$CandidateContainerNames = @("rafc-postgres", "my-postgres", "postgres")
$PostgresUser = "postgres"

function Write-Step {
    param([string]$Message)
    Write-Host "[show-postgres] $Message"
}

function Resolve-PostgresContainer {
    param([string[]]$Names)

    foreach ($name in $Names) {
        $resolved = docker ps -a --filter "name=^/$name$" --format "{{.Names}}" 2>$null
        if ($resolved -eq $name) {
            return $name
        }
    }

    return $null
}

try {
    $null = docker version --format "{{.Server.Version}}" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not available from this PowerShell session."
    }

    $containerName = Resolve-PostgresContainer -Names $CandidateContainerNames
    if (-not $containerName) {
        throw "Could not find a PostgreSQL container. Tried: $($CandidateContainerNames -join ', ')"
    }

    $containerRunning = docker ps --filter "name=^/$containerName$" --format "{{.Names}}" 2>$null
    if ($containerRunning -ne $containerName) {
        Write-Step "Container '$containerName' exists but is stopped. Starting it now..."
        docker start $containerName | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to start container '$containerName'."
        }
    }

    Write-Step "Databases in ${containerName}:"
    docker exec -i $containerName psql -U $PostgresUser -c "\l"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to list databases from '$containerName'."
    }

    $databaseNames = docker exec -i $containerName psql -U $PostgresUser -At -c "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to query database names from '$containerName'."
    }

    foreach ($databaseName in $databaseNames) {
        $databaseName = $databaseName.Trim()
        if (-not $databaseName) {
            continue
        }

        Write-Host ""
        Write-Host "============================================================"
        Write-Host "Database: $databaseName"
        Write-Host "============================================================"

        Write-Host ""
        Write-Host "Schemas:"
        docker exec -i $containerName psql -U $PostgresUser -d $databaseName -c "\dn"

        Write-Host ""
        Write-Host "Tables:"
        docker exec -i $containerName psql -U $PostgresUser -d $databaseName -c "\dt *.*"
    }
}
catch {
    Write-Error $_
    exit 1
}