# North Project Makefile

.PHONY: build dev dev-stop dev-emu dev-front deploy-web deploy-funcs format test clean verify \
       android-build android-clean android-keystore-list

# Build
build:
	pnpm run generate:releases
	pnpm run build

build-local:
	pnpm run generate:releases
	pnpm --filter @north/backend build && pnpm --filter @north/frontend build:debug
	@echo "Moving build to out-debug..."
	-@powershell -Command "if (Test-Path frontend/out-debug) { Remove-Item -Recurse -Force frontend/out-debug }"
	@powershell -Command "Start-Sleep -Seconds 3; Rename-Item frontend/out -NewName out-debug"

# Development
dev: build-local
	@echo "Starting Emulators (Debug Mode)..."
	npx firebase emulators:start --config firebase.debug.json

dev-stop:
	@echo "Stopping existing emulator processes..."
	-@powershell -Command "Get-NetTCPConnection -LocalPort 5001, 8080, 5000, 9099, 4000, 4400, 4500 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue }"



# Deployment
deploy: build
	npx firebase deploy

# Code Quality
format:
	pnpm biome format --write .

lint:
	pnpm biome check .

fix:
	pnpm biome check --write .

# Testing
test:
	pnpm test

# Verification Cycle
verify:
	@powershell -Command "if (!(Test-Path .tmp)) { New-Item -ItemType Directory -Path .tmp }"
	make fix
	make lint > .tmp/lint.log
	pnpm --filter @north/backend test > .tmp/test.log
	make build-local > .tmp/build.log
	@echo "Verification successful. Cleaning up .tmp..."
	@powershell -Command "Remove-Item .tmp/* -Force"

# Android
android-build:
	cd android && gradlew assembleRelease

android-clean:
	cd android && gradlew clean