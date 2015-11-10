'use strict';
/* global describe, it */
var assert = require('assert');
var src = require('../lib/index');
var Cycle = require('@motorcycle/core');
var most = require('most');
var makeHTTPDriver = src.makeHTTPDriver;

function run(uri) {
  describe('makeHTTPDriver', function () {
    it('should be a driver factory', function () {
      assert.strictEqual(typeof makeHTTPDriver, 'function');
      var output = makeHTTPDriver();
      assert.strictEqual(typeof output, 'function');
    });
  });

  describe('HTTP Driver', function () {
    it('should throw when request stream emits neither string nor object',
      function(done) {
        var request$ = most.just(123);
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.join().drain()
          .then( function onNext(x) {
            assert.fail();
          })
          .catch( err => {
            assert.strictEqual(err.message, 'Observable of requests given to ' +
              'HTTP Driver must emit either URL strings or objects with ' +
              'parameters.'
            );
            done()
          })
      }
    );

    it('should throw when given options object without url string',
      function(done) {
        var request$ = most.just({method: 'post'});
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.join().drain()
          .then(
            function onNext() { assert.fail(); }
          )
          .catch(
            function onError(err) {
              assert.strictEqual(
                err.message, 'Please provide a `url` property in the request ' +
                'options.'
              );
              done();
            }
          );
      }
    );

    it('should return response metastream when given a simple URL string',
      function(done) {
        var request$ = most.just(uri + '/hello');
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.observe(function(response$) {
          assert.strictEqual(response$.request, uri + '/hello');
          response$.observe(function(response) {
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.text, 'Hello World');
            done();
          });
        });
      }
    );

    it('should return response metastream when given simple options obj',
      function(done) {
        var request$ = most.just({
          url: uri + '/pet',
          method: 'POST',
          send: {name: 'Woof', species: 'Dog'}
        });
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.observe(function(response$) {
          assert.strictEqual(response$.request.url, uri + '/pet');
          assert.strictEqual(response$.request.method, 'POST');
          assert.strictEqual(response$.request.send.name, 'Woof');
          assert.strictEqual(response$.request.send.species, 'Dog');
          response$.observe(function(response) {
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.text, 'added Woof the Dog');
            done();
          });
        });
      }
    );

    it('should return response metastream when given another options obj',
      function(done) {
        var request$ = most.just({
          url: uri + '/querystring',
          method: 'GET',
          query: {foo: 102030, bar: 'Pub'}
        });
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.observe(function(response$) {
          assert.strictEqual(response$.request.url, uri + '/querystring');
          assert.strictEqual(response$.request.method, 'GET');
          assert.strictEqual(response$.request.query.foo, 102030);
          assert.strictEqual(response$.request.query.bar, 'Pub');
          response$.observe(function(response) {
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.foo, '102030');
            assert.strictEqual(response.body.bar, 'Pub');
            done();
          });
        });
      }
    );

    it('should return response metastream when given yet another options obj',
      function(done) {
        var request$ = most.just({
          url: uri + '/delete',
          method: 'DELETE',
          query: {foo: 102030, bar: 'Pub'}
        });
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.observe(function(response$) {
          assert.strictEqual(response$.request.url, uri + '/delete');
          assert.strictEqual(response$.request.method, 'DELETE');
          response$.observe(function(response) {
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.deleted, true);
            done()
          })
        })
      }
    );

    it('should send 500 server errors to response$ onError',
      function(done) {
        var request$ = most.just(uri + '/error');
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.observe(function(response$) {
          assert.strictEqual(response$.request, uri + '/error');
          response$.drain()
            .then( function onNext() { assert.fail(); } )
            .catch( function onError(err) {
              assert.strictEqual(err.status, 500);
              assert.strictEqual(err.message, 'Internal Server Error');
              assert.strictEqual(err.response.text, 'boom');
              done();
            });
        });
      }
    );

    it('should replay past events',
      function(done){
        var request$ = most.just({
          url: uri + '/delete',
          method: 'DELETE',
          query: {foo: 102030, bar: 'Pub'}
        });
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.observe(function(response$) {
          assert.strictEqual(response$.request.url, uri + '/delete');
          assert.strictEqual(response$.request.method, 'DELETE');
          response$.observe(function(response) {
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.deleted, true);
          })
          setTimeout(function(){
            response$.observe(function(response) {
              assert.strictEqual(response.status, 200);
              assert.strictEqual(response.body.deleted, true);
              done()
            })
          }, 50)
        })
      }
    );

  });
}

module.exports = run;
