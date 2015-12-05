import most from 'most'
import hold from '@most/hold'
import superagent from 'superagent'

const notNull = arg => arg !== null
const typeOf = (type, arg) => typeof arg === type

const is = {
  notNull,
  typeOf,
}

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

    request = is.typeOf(`function`, request.redirects) ?
      request.redirects(redirects) :
      request
    request = request.type(type)
    request = is.notNull(send) ? request.send(send) : request
    request = is.notNull(accept) ? request.accept(accept) : request
    request = is.notNull(query) ? request.query(query) : request
    request = withCredentials ? request.withCredentials() : request
    request = is.notNull(user) && is.notNull(password) ?
      request.auth(user, password) :
      request

    for (let key in headers) {
      if (headers.hasOwnProperty(key)) {
        request = request.set(key, headers[key])
      }
    }
    if (is.notNull(field)) {
      for (let key in field) {
        if (field.hasOwnProperty(key)) {
          request = request.field(key, field[key])
        }
      }
    }
    if (is.notNull(attach)) {
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
        let request =
          is.typeOf(`string`, reqOptions) || is.typeOf(`object`) ?
            urlToSuperagent(reqOptions) : null

        if (!is.notNull(request)) {
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
