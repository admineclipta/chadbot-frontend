@echo off
echo 🧹 Limpiando dependencias problemáticas...

REM Eliminar node_modules
if exist node_modules (
    echo Eliminando node_modules...
    rmdir /s /q node_modules
)

REM Eliminar package-lock.json si existe
if exist package-lock.json (
    echo Eliminando package-lock.json...
    del package-lock.json
)

REM Limpiar cache de npm
echo Limpiando cache de npm...
npm cache clean --force

REM Reinstalar dependencias
echo Reinstalando dependencias...
npm install

echo ✅ Dependencias limpiadas y reinstaladas!
echo 💡 Ahora puedes usar: npm run serve
