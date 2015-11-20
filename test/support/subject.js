var most = require('most')

function now(fn) {
  setTimeout(fn, 0)
}

function Subject(initial) {
  var _add
  var _end
  var _error

  var stream = most.create(
    function(add, end, error) {
      _add = add
      _end = end
      _error = error
      return _error
    }
  )

  stream.push = function(v) {
    now( function() {typeof _add === 'function' ? _add(v) : void 0})
  }

  stream.plug = function(value$) {
    value$.forEach(stream.push)
  }

  if (initial) {
    stream.push(initial)
  }

  return stream
}

module.exports = Subject
