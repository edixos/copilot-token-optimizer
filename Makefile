.PHONY: help install clean lint publish-local

# Default target
help:
	@echo "Available commands:"
	@echo "  make install        - Install dependencies cleanly (npm ci)"
	@echo "  make clean          - Remove node_modules and npm logs"
	@echo "  make publish-local  - Safely publish the package to npm from local machine"
	@echo "  make fix            - Run npm pkg fix to format package.json"

install:
	npm ci

clean:
	rm -rf node_modules
	rm -f *.tgz
	rm -f npm-debug.log*

fix:
	npm pkg fix

# Checks if the git working directory is clean before publishing
check-git:
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "Error: Working directory is not clean. Commit your changes first."; \
		exit 1; \
	fi

publish-local: check-git install
	@if [ -z "$(OTP)" ]; then \
		echo "Error: OTP is required. Usage: make publish-local OTP=123456"; \
		exit 1; \
	fi
	@echo "Publishing to npm..."
	npm publish --access public --otp=$(OTP)