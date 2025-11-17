# dump_prj.ps1
# Script to dump project files to a text file

param(
    [string]$SourcePath = ".",
    [string]$OutputFile = "project-dump.txt",
    [string[]]$ExcludeFolders = @("node_modules", ".git", ".next", "dist", "build", ".vscode"),
    [string[]]$ExcludeFiles = @(".DS_Store", ".env.local", "*.log")
)

# Validate source path
if (-not (Test-Path $SourcePath)) {
    Write-Host "[ERROR] Path '$SourcePath' does not exist" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Starting project dump..." -ForegroundColor Cyan
Write-Host "[INFO] Source: $SourcePath" -ForegroundColor Green
Write-Host "[INFO] Output: $OutputFile" -ForegroundColor Green
Write-Host ""

# Create output file
try {
    $outputStream = [System.IO.StreamWriter]::new($OutputFile, $false, [System.Text.Encoding]::UTF8)
} catch {
    Write-Host "[ERROR] Cannot create output file '$OutputFile'" -ForegroundColor Red
    exit 1
}

$totalFiles = 0
$skippedFiles = 0

# Get all files recursively
try {
    $files = Get-ChildItem -Path $SourcePath -Recurse -File -ErrorAction SilentlyContinue
    
    foreach ($file in $files) {
        $fullPath = $file.FullName
        $sourcePath_Full = (Resolve-Path $SourcePath).Path
        $relativePath = $fullPath.Substring($sourcePath_Full.Length).TrimStart([System.IO.Path]::DirectorySeparatorChar)
        
        # Check if file should be excluded
        $shouldExclude = $false
        
        # Check exclude folders
        foreach ($excludeFolder in $ExcludeFolders) {
            if ($relativePath -like "*$excludeFolder*") {
                $shouldExclude = $true
                break
            }
        }
        
        # Check exclude file patterns
        if (-not $shouldExclude) {
            foreach ($excludePattern in $ExcludeFiles) {
                if ($file.Name -like $excludePattern) {
                    $shouldExclude = $true
                    break
                }
            }
        }
        
        if ($shouldExclude) {
            $skippedFiles++
            continue
        }
        
        # Skip binary files
        $binaryExtensions = @(".png", ".jpg", ".jpeg", ".gif", ".ico", ".bin", ".exe", ".dll", ".zip", ".tar", ".gz", ".woff", ".woff2", ".ttf")
        if ($binaryExtensions -contains $file.Extension.ToLower()) {
            $skippedFiles++
            continue
        }
        
        # Skip large files (> 1MB)
        if ($file.Length -gt 1MB) {
            Write-Host "[SKIP] File too large (>1MB): $relativePath" -ForegroundColor Yellow
            $skippedFiles++
            continue
        }
        
        # Read and write file content
        try {
            $content = Get-Content -Path $fullPath -Raw -ErrorAction SilentlyContinue
            
            if ($null -eq $content) {
                $content = ""
            }
            
            # Write to output
            $outputStream.WriteLine("//$relativePath")
            $outputStream.WriteLine($content)
            $outputStream.WriteLine("")
            
            $totalFiles++
            Write-Host "[OK] $relativePath" -ForegroundColor Green
        } catch {
            Write-Host "[SKIP] Unreadable: $relativePath" -ForegroundColor Yellow
            $skippedFiles++
        }
    }
} catch {
    Write-Host "[ERROR] File processing error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    $outputStream.Close()
    $outputStream.Dispose()
}

Write-Host ""
Write-Host "[SUCCESS] Dump completed!" -ForegroundColor Cyan
Write-Host "[INFO] Summary:"
Write-Host "       Total files: $totalFiles" -ForegroundColor Green
Write-Host "       Skipped: $skippedFiles" -ForegroundColor Yellow
Write-Host "       Output: $OutputFile" -ForegroundColor Green
