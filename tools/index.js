const xmlParser = require('xml-js')

const safeJsonParse = value => {
  try {
    return JSON.parse(value)
  } catch (error) {
    try {
      return xmlParser.xml2js(value, { ignoreComment: true, alwaysChildren: true })
    } catch (error) {
      return value
    }
  }
}

const deepSearch = (obj, path) => {
  try {
    const steps = path.split('.')
    let current = obj
    for (let i = 0; i < steps.length; i++) {
      const [ name, index ] = steps[i].split(/[\[\]]/g)
      current = index ? current[name][index] : current[name]
    }
    return current
  }
  catch (err) {
    return undefined
  }
}

const parseValue = (schema, input, flowData = {}) => {
  try {
    let output = null

    switch (typeof schema) {
      case 'string':
      const match = schema.match(/\{.+?\}/)
      if (match) {
        const [ name, separator ] = match[0].substring(1, schema.length - 1).split('/')
        const substitute = match[0].substring(1, schema.length - 1).split('?')[1]
        if (separator && typeof input[name] === 'string') output = input[name].split(separator)
        else if (substitute) {
          if (input[name]) output = substitute
          else return null
        }
        else if (typeof input[name] === 'object') output = input[name]
        else {
          const value = schema.replace(/\{.+?\}/g, sub => {
            const prop = sub.substring(1, sub.length - 1)
            if (input[prop]) {
              if (flowData[prop]) delete flowData[prop]
              return input[prop]
            } 
            else return ""
          })
          output = value || null
        }
        if (output && flowData[name]) delete flowData[name]
      }
      else output = schema
      break
      
      case 'object':
      for (let i in schema) { 
        const value = parseValue(schema[i], input, flowData)
        if (value) {
          if (!output) output = schema.constructor === Array ? [] : {}
          output[i] = value
        }
      }
      for (let i in output) {
        if (output[i] === null) delete output[i]
      }
      break

      case 'number':
      case 'boolean':
      return output = schema
    }

    return output

  } catch (error) {
    console.log(`ERROR: ${error}`)
    throw error
  }
}

const schemaToMetadata = (schema, namePath, typePath, propsPath, titlePath, requiredPath, exclude = [], wrap) => {
  try {
    let metadata = {}
    
    for (let i in schema) { 
      const name = deepSearch(schema[i], namePath)
      const type = deepSearch(schema[i], typePath)
      const props = deepSearch(schema[i], propsPath)
      
      if (exclude.indexOf(name) === -1) {
        metadata[name] = {}
        if (props) {
          metadata[name] 
            = schemaToMetadata(props, namePath, typePath, propsPath, titlePath, requiredPath, exclude)
        }
        else metadata[name] = {
          type: type === 'string' || 'boolean' || 'number' || 'object' ? type : 'string',
          title: deepSearch(schema[i], titlePath) || name,
          required: deepSearch(schema[i], requiredPath) || false
        }
      }
    }
    if (typeof wrap === 'string') return {
      type: 'object',
      properties: {
        [wrap]: {
          type: 'object',
          title: wrap,
          properties: metadata
        }
      }
    }
    else return {
      type: 'object',
      properties: metadata
    }

  } catch (error) {
    console.log(`ERROR: ${JSON.stringify(error)}`)
    throw error
  }
}

module.exports = {
  safeJsonParse, deepSearch, parseValue, schemaToMetadata
}