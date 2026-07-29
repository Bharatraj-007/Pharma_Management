@echo off
echo Adding Windows Firewall rule to allow Smart Pharma Backend (port 5001)...
echo.
echo This requires administrator privileges.
echo.
pause

netsh advfirewall firewall delete rule name="Smart Pharma Backend" protocol=TCP localport=5001
netsh advfirewall firewall add rule name="Smart Pharma Backend" dir=in action=allow protocol=TCP localport=5001

echo.
echo Done! Port 5001 is now allowed through Windows Firewall.
echo You can now access the backend from your phone on the same Wi-Fi network.
echo.
pause
