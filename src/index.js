import most from 'most'
import hold from '@most/hold'
import superagent from 'superagent'

const optionsToSuperagent =
  ({ // eslint-disable-line
    // ESLint doesn't like function complexity
    url,
    send = null,
    accept = null,
    query = null,
    user = null,
    password = null,
    field = null,
    attach = null, // if valid, should be an array
    withCredentials = false,
    headers = {},
    redirects = 5,
    type = `json`,
    method = `get`,
  }) => {
    if (typeof url !== `string`) {
      throw new Error(`Please provide a \`url\` property in the request ` +
        `options.`)
    }
    const lowerCaseMethod = method.toLowerCase()
    const sanitizedMethod =
      lowerCaseMethod === `delete` ?
        `del` :
        lowerCaseMethod

    let request = superagent[sanitizedMethod](url)
    if (typeof request.redirects === `function`) {
      request = request.redirects(redirects)
    }
    request = request.type(type)
    if (send !== null) {
      request = request.send(send)
    }
    if (accept !== null) {
      request = request.accept(accept)
    }
    if (query !== null) {
      request = request.query(query)
    }
    if (withCredentials) {
      request = request.withCredentials()
    }
    if (user !== null && password !== null) {
      request = request.auth(user, password)
    }
    for (let key in headers) {
      if (headers.hasOwnProperty(key)) {
        request = request.set(key, headers[key])
      }
    }
    if (field !== null) {
      for (let key in field) {
        if (field.hasOwnProperty(key)) {
          request = request.field(key, field[key])
        }
      }
    }
    if (attach !== null) {
      for (let i = attach.length - 1; i >= 0; i--) {
        const a = attach[i]
        request = request.attach(a.name, a.path, a.filename)
      }
    }
    return request
  }

const urlToSuperagent = url => superagent.get(url)

const createResponse$ =
  reqOptions =>
    most.create(
      (add, end, error) => {
        let request
        if (typeof reqOptions === `string`) {
          request = urlToSuperagent(reqOptions)
        } else if (typeof reqOptions === `object`) {
          request = optionsToSuperagent(reqOptions)
        } else {
          error(new Error(`Observable of requests given to HTTP ` +
            `Driver must emit either URL strings or objects with parameters.`))
          return () => {} // noop
        }

        try {
          request.end((err, res) => {
            if (err) {
              error(err)
            } else {
              add(res)
              end()
            }
          })
        } catch (err) {
          error(err)
        }

        return function onDispose() {
          request.abort()
        }
      }
    )

const isolateSource =
  (response$$, scope) =>
    response$$.filter(
      res$ => Array.isArray(res$.request._namespace) &&
        res$.request._namespace.indexOf(scope) !== -1
    )

const isolateSink =
  (request$, scope) =>
    request$.map(
      req => {
        if (typeof req === `string`) {
          return {url: req, _namespace: [scope]}
        }
        req._namespace = req._namespace || []
        req._namespace.push(scope)
        return req
      }
    )

const makeHTTPDriver =
  ({eager = false} = {eager: false}) =>
    request$ => {
      const _response$$ =
        request$
          .map(
            reqOptions => {
              let response$ = createResponse$(reqOptions)
              if (eager || reqOptions.eager) {
                response$ = hold(response$)
                response$.drain()
              }
              response$.request = reqOptions
              return response$
            }
          )
      _response$$.drain()
      let response$$ = hold(_response$$)
      response$$.isolateSink = isolateSink
      response$$.isolateSource = isolateSource
      return response$$
    }

export {
  optionsToSuperagent,
  urlToSuperagent,
  createResponse$,

  makeHTTPDriver,
}
