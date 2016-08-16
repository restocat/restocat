SOURCES = lib/**/*.js

TESTS = test/lib/*.js test/lib/**/*.js test/together.js

all: lint test

lint:
	@echo "Running code quality tests..."
	./node_modules/.bin/eslint $(SOURCES) $(TESTS)

lint-fix:
	./node_modules/.bin/eslint $(SOURCES) $(TESTS) --fix

test:
ifeq ($(TRAVIS),true)
	@echo "Running tests for Travis..."
	$(MAKE) travis-cov
else
	@echo "Running tests..."
	./node_modules/.bin/mocha $(TESTS) --recursive
endif

test-cov:
	@echo "Getting coverage report..."
	@NODE_ENV=test ./node_modules/.bin/istanbul cover -x "**/http/**" ./node_modules/.bin/_mocha -- $(TESTS) --recursive

travis-cov:
	@echo "Getting coverage for Travis..."
	./node_modules/.bin/istanbul cover -x "**/http/**" ./node_modules/.bin/_mocha --report lcovonly -- $(TESTS) --recursive -R spec && ./node_modules/.bin/codecov

clean:
	rm -rf coverage

.PHONY: test