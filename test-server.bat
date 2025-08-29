@echo off
echo 🔍 Testando conectividade com o servidor...
echo.

echo 📡 Testando servidor LOCAL (desenvolvimento):
curl -s -o /dev/null -w "%%{http_code}" http://192.168.1.10:5000/auterota/login
echo  - http://192.168.1.10:5000/auterota/login
echo.

echo 🌐 Testando servidor PRODUÇÃO:
curl -s -o /dev/null -w "%%{http_code}" https://backbarbearialopez.onrender.com/auterota/login
echo  - https://backbarbearialopez.onrender.com/auterota/login
echo.

echo 💡 Para iniciar o servidor local:
echo    1. Navegue até a pasta do backend
echo    2. Execute: npm install
echo    3. Execute: npm start
echo    4. Teste novamente este script
echo.
pause
