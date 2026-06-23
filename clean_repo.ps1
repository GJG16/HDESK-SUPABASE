$projectRoot = "E:\lenguaje de pogramacion\PROYECTO HELPDESK"

Write-Host "Iniciando limpieza del repositorio en $projectRoot..." -ForegroundColor Cyan

# 1. Eliminar carpetas __pycache__ y .angular/cache
Get-ChildItem -Path $projectRoot -Include "__pycache__", ".angular" -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { $_.PSIsContainer } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✔️ Carpetas caché eliminadas." -ForegroundColor Green

# 2. Eliminar archivos .log y temporales
Get-ChildItem -Path $projectRoot -Include "*.log", "*.tmp" -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "✔️ Archivos .log y temporales eliminados." -ForegroundColor Green

# 3. Eliminar archivos .md y .txt EXCEPTO los críticos
$protectedFiles = @("README.md", "requirements.txt")
Get-ChildItem -Path $projectRoot -Include "*.md", "*.txt" -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { 
    $_.Name -notin $protectedFiles -and $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "venv" -and $_.FullName -notmatch "\.git"
} | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "✔️ Archivos de texto e información secundaria eliminados." -ForegroundColor Green

Write-Host "¡Limpieza completada con éxito!" -ForegroundColor Green
