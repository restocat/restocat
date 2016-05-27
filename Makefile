SOURCES = lib/*.js

TESTS = test/lib/**/*.js

all: lint test

lint:
	@echo "Running code quality tests..."
	@NODE_ENV=test ./node_modules/.bin/eslint $(SOURCES) $(TESTS)

test:
	@echo "Running tests..."
	@NODE_ENV=test ./node_modules/.bin/mocha $(TESTS) --recursive

test-cov:
	@echo "Getting coverage report..."
	@NODE_ENV=test ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha -- $(TESTS) --recursive

clean:
	rm -rf coverage

.PHONY: test