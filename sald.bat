@echo off
set /p option=Queres abrir vscode(y/n):

if %option% geq y (
	code . 
) else (
	npm run dev && start http://localhost:3000
)


pause
