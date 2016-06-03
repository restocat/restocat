## Code Style
Restocat uses [ESLint](http://eslint.org/) for checking the code style.
You should run it using `make lint` before committing to the repo. If you need
to fix indentations automatically then use `make lint-fix`.

`make lint` is a part of `npm test` script.

## Tests
Restocat uses [mocha](https://www.npmjs.org/package/mocha) and some rules:

* The `test` directory structure copies the actual structure of the project
* The test's `describe` calls should contain a class name and a method name like following:
```javascript
describe('lib/finders/InjectionFinder', () => {
  describe('#find', () => {
    it('should find all dependency injections in source', () => {
      // test
    });
  });
});
```
You should run tests using `make test` before committing to the repo.

`make test` is a part of `npm test` script.

## Submit a PR
* PR should be submitted from a separate branch (use `git checkout -b "fix-123"`) to a `develop` branch
* PR should not decrease the code coverage more than by 1%
* PR's commit message should use present tense and be capitalized properly (i.e., `Fix #123: Add tests for RequestRouter.`)

Still have any questions? Join the [Gitter](https://gitter.im/restocat/restocat) and ask them there.