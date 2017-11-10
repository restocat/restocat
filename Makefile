SOURCES = lib/**/*.js

TESTS = test/lib/*.js test/lib/**/*.js test/together.js

all: lint test

lint:
	@echo "Running code quality tests..."
	eslint $(SOURCES) $(TESTS)

lint-fix:
	eslint $(SOURCES) $(TESTS) --fix

test:
ifeq ($(TRAVIS),true)
	@echo "Running tests for Travis..."
	$(MAKE) travis-cov
else
	@echo "Running tests..."
	mocha $(TESTS) --recursive
endif

test-cov:
	@echo "Getting coverage report..."
	@NODE_ENV=test istanbul cover _mocha -- $(TESTS) --recursive

travis-cov:
	@echo "Getting coverage for Travis..."
	istanbul cover _mocha --report lcovonly -- $(TESTS) --recursive -R spec
	codecov

clean:
	rm -rf coverage

.PHONY: test