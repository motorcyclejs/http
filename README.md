# Motorcycle.js HTTP Driver [![Build Status](https://travis-ci.org/motorcyclejs/http.svg?branch=develop)](https://travis-ci.org/motorcyclejs/http)

The Standard HTTP Driver for motorcycle.js based on superagent.


## Want to Contribute?

If you found an issue or want to contribute code, please read
the [contributing guidelines](https://github.com/motorcyclejs/motorcycle/blob/master/CONTRIBUTING.md)

## Examples

Basics:
```
import most from 'most'
import {run} from '@motorcycle/core';
import {makeHTTPDriver} from '@motorcycle/http';

function main(responses) {
  // ...
}

const drivers = {
  HTTP: makeHTTPDriver()
}

run(main, drivers);
```

Simple and normal use case:
```
function main(responses) {
  const HELLO_URL = 'http://localhost:8080/hello';
  let request$ = most.just(HELLO_URL);
  let vtree$ = responses.HTTP
    .filter(res$ => res$.request === HELLO_URL)
    .join()
    .map(res => res.text) // We expect this to be "Hello World"
    .startWith('Loading...')
    .map(text =>
      h('div.container', [
        h('h1', text)
      ])
    );

  return {
    DOM: vtree$,
    HTTP: request$
  };
}
```
