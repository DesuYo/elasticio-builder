const safeJsonParse = value => {
  try {
    return JSON.parse(value)
  } catch (error) {
    return value
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
        const match = schema.match(/\{\{\w+?\}\}/)
        if (match) {
          const name = match[0].substring(2, schema.length - 2)
          output = input[name] || null
          if (output && flowData[name]) delete flowData[name]
        }
        else {
          const value = schema.replace(/\{\w+?\}/g, sub => {
            const prop = sub.substring(1, sub.length - 1)
            if (input[prop]) {
              if (flowData[prop]) delete flowData[prop]
              return input[prop]
            } 
            else return ""
          })
          output = value || null
        }
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