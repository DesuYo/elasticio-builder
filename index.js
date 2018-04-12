const got = require('got')
const { merge } = require('lodash')
const tools = require('./tools')

/**
 * @typedef {object} AuthOptions
 * @property {string} [headerName] - Authorization header name
 * @property {Function<Promise<object>>} func - Async func witch returns <authString> on resolve
 */

/**
 * @typedef {object} RequestOptions
 * @property {string} method - Request method
 * @property {string} url - Request URL. You can pass variables with {name} notation
 * @property {AuthOptions} auth - Authorization options
 * @property {Object.<string,*>} [headers] - Additional request headers
 * @property {Object.<string,*>} [spreadInput] - Additional input properties
 * @property {Object.<string,*>} [spreadBody] - Spread request body. You can pass variables with {name} notation
 * @property {boolean} isFormData - If true, send body as form data
 */

/**
 * Awesome function for creating elastic.io action, trigger or even webhook!
 * Written by Oleh, opavlov@conceptsoft.io
 * @param {RequestOptions} options Request options
 */
exports.request = function (options) {
  return async function () {
    try {
      let { method, url, auth, headers, spreadInput, spreadBody, isFormData } = options
      let msg = arguments[0].body || {}
      let input = merge({}, arguments[0], arguments[1], spreadInput)

      let reqOptions = {}
      reqOptions.method = method.toUpperCase()
      reqOptions.headers = headers || {}
      if (auth) {
        const { headerName = 'Authorization', func } = auth
        const res = await func(cfg)
        reqOptions.headers[headerName] = res.authString
        if (res && res.constructor === Object) input = merge(input, res)
      }
     
      url = tools.parseValue(url, input, msg)
      if (reqOptions.method === 'GET') {
        if (url.indexOf('?') == -1) url += '?'
        for (let prop in msg) url += `&${prop}=${msg[prop]}`
        msg = {}
      }
      else {
        if (spreadBody && spreadBody.constructor === Object) {
          reqOptions.body = tools.parseValue(spreadBody, input, msg) 
        }
        
        if (isFormData) {
          reqOptions.form = true
          reqOptions.body = merge(reqOptions.body, msg)
          reqOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        } 
        else { 
          reqOptions.body = JSON.stringify(merge(reqOptions.body, msg))
          reqOptions.headers['Content-Type'] = 'application/json'
        }
      }
      console.log(`URL: ${url}`)
      console.log(`REQUEST OPTIONS: ${JSON.stringify(reqOptions)}`) 

      const { requestUrl, statusCode, body } = await got(url, reqOptions)
      console.log(`RESPONSE BODY: ${body}`)

      const preparedData = { 
        requestUrl,
        statusCode,
        payload: tools.safeJsonParse(body) || 'NO MESSAGE'
      }
      if (this.emit) this.emit('data', { body: preparedData })
      else return preparedData

    } catch (error) {
      console.log(`ERROR: ${error}`)
      let preparedData = { error: error.message }
      switch (error.constructor) {
        case got.HTTPError: 
          const { requestUrl, statusCode, body } = error.response
          preparedData = { 
            requestUrl,
            statusCode, 
            payload: tools.safeJsonParse(body) || 'NO MESSAGE' 
          }
          break
        case got.RequestError: 
          preparedData = { 
            error: 'Invalid URL or server does not response', 
            hostname: error.hostname
          }
          
      }

      if (this.emit) this.emit('data', { body: preparedData })
      else return preparedData

    } finally {
      this.emit('end')
    }
  }
}

/**
 * @typedef {object} AuthOptions
 * @property {string} [headerName] - Authorization header name
 * @property {Function<Promise<object>>} func - Async func witch returns <authString> on resolve
 */

/**
 * @typedef {object} SelectViewOptions
 * @property {string} url - Request URL. You can pass variables with {name} notation
 * @property {AuthOptions} auth - Authorization options
 * @property {Object.<string,*>} [headers] - Additional request headers. For example you can use it for auth header
 * @property {string} [schemaPath] - Path to schema in response. Use {obj.arr[0].prop} notation
 * @property {string} valuePath - Relative path to select view option's value in schema. Use {obj.arr[0].prop} notation
 * @property {string} titlePath - Relative path to select view option's title in schema. Use {obj.arr[0].prop} notation
 */

/**
 * Awesome function for generating SelectView's schema
 * Written by Oleh, opavlov@conceptsoft.io
 * @param {SelectViewOptions} options SelectView options
 */
exports.genSelectViewOptions = function(options) {
  return async function(cfg) {
    try {
      let { url, auth, headers = {}, schemaPath, valuePath, titlePath } = options
       
      if (auth) {
        const { headerName = 'Authorization', func } = auth
        const res = await func(cfg)
        headers[headerName] = res.authString
        if (res && res.constructor === Object) cfg = merge(cfg, res)
      }
      console.log(`HEADERS: ${JSON.stringify(headers)}`)

      url = tools.parseValue(url, cfg)
      console.log(`URL: ${url}`)
      const body = JSON.parse((await got.get(url, { headers })).body)
      console.log(`RESPONSE BODY: ${JSON.stringify(body)}`)
      
      const schema = schemaPath ? tools.deepSearch(body, schemaPath) : body
      console.log(`SCHEMA: ${JSON.stringify(schema)}`)
      let result = {}
      for (obj of schema) result[tools.deepSearch(obj, valuePath)] = tools.deepSearch(obj, titlePath)
      return result

    } catch (error) {
      console.log(`ERROR: ${JSON.stringify(error)}`)
      throw error
    }
  }
}

/**
 * @typedef {object} AuthOptions
 * @property {string} [headerName] - Authorization header name
 * @property {Function<Promise<object>>} func - Async func witch returns <authString> on resolve
 */

/**
 * @typedef {object} MetadataOptions
 * @property {string} url - Request URL. You can pass variables with {name} notation
 * @property {AuthOptions} auth - Authorization options
 * @property {Object.<string,*>} [headers] - Additional request headers. For example you can use it for auth header
 * @property {string} [schemaPath] - Path to schema in response. Use {obj.arr[0].prop} notation
 * @property {string} namePath - Relative path to metadata field name in schema. Use {obj.arr[0].prop} notation
 * @property {string} typePath - Relative path to metadata field type in schema. Use {obj.arr[0].prop} notation
 * @property {string} propsPath - Relative path to metadata object-field with properties in schema. Use {obj.arr[0].prop} notation
 * @property {string} titlePath - Relative path to metadata field title in schema. Use {obj.arr[0].prop} notation
 * @property {string} requiredPath - Relative path to metadata <is required?> info in schema. Use {obj.arr[0].prop} notation
 * @property {string} exclude - array of fields whitch should be exluded
 * @property {string} wrap - name of object. It wraps all generic metadata
 */
/**
 * Awesome function for generating dynamic metadata
 * Written by Oleh, opavlov@conceptsoft.io
 * @param {MetadataOptions} options Metadata options
 */
exports.genMetadata = function(options) {
  return async function(cfg) {
    try {
      let { 
        url, auth, headers = {}, schemaPath, namePath, typePath, 
        propsPath, titlePath, requiredPath, exclude, wrap 
      } = options
      
      if (auth) {
        const { headerName = 'Authorization', func } = auth
        const res = await func(cfg)
        headers[headerName] = res.authString
        if (res && res.constructor === Object) cfg = merge(cfg, res)
      }
    
      url = tools.parseValue(url, cfg)
      const body = JSON.parse((await got.get(url, { headers })).body)

      const schema = schemaPath ? tools.deepSearch(body, schemaPath) : body
      console.log(`SCHEMA: ${JSON.stringify(schema)}`)
      return {
        in: tools.schemaToMetadata(schema, namePath, typePath, propsPath, titlePath, requiredPath, exclude, wrap)
      }

    } catch (error) {
      console.log(`ERROR: ${JSON.stringify(error)}`)
      throw error
    }
  }
}