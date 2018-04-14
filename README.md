# Elasticio-builder
Awesome tools for Elastic.io
## Getting started
```
npm i elasticio-node elasticio-sailor-nodejs elasticio-builder
```
* Read [Elastic.io docs](https://support.elastic.io/support/home)
## Create action or polling trigger
For this purpose you can use:
```
request(options)
```
### Basic usage
Create simple action or polling trigger:
```
exports.process = require('elasticio-builder').request({
  method: 'GET',
  url: 'https://{host}/api/users/{user_id}' //all other properties in input metadata schema will be added as query params
})
```
As you can see we can put input metadata variables or config variables with {name} notation.
We cannot provide it as ${msg.body.name} or ${cfg.name} in template string, 
because we don't have access to this parametrs in this scope.
When we send GET request, all input metadata properties will be added as query parameters.
On POST, PUT, PATCH, DELETE requests it will be added in body.
But what if we want to add some properties as query params in non-get request?
Yes, we can add it :)
```
exports.process = require('elasticio-builder').request({
  method: 'POST',
  url: 'https://{host}/api/users?param={name}' //property name and host can be specified in input schema or config fields
  //all other properties in input metadata schema will be in body
})
```
### Authorize our request
We can provide authorization function
```
exports.process = require('elasticio-builder').request({
  method: 'POST',
  url: 'https://{host}/api/users?param={name}',
  auth: {
    headerName: 'apllication-key',  //default value is Authorization
    func: require('../verifyCredentials.js') //this function should return authString property on resolve
  }
})
```
Example of auth function:
```
module.exports = async function(cfg) {
  return { authString: `Bearer ${cfg.key}`, ...cfg }
}
```
Auth function should return Promise with object on resolve.
authString - required property in this object.
Also we can return other properties, they will be used as additional input data.
### Advance usage
What if our body has very complicated structure? Or we just want to add additional property to it.
We can do it.
```
exports.process = require('elasticio-builder').request({
  method: 'POST',
  url: 'https://{host}/api/users?param={name}',
  auth: {
    func: require('../verifyCredentials.js')
  },
  spreadBody: {
    age: '{age} years',
    weight: '{weight}'
    additionalInfo: {
      nationality: '{nat}'
    }
  }
})
```
Again, we just use {name} notation to retrieve property from input schema, config's fields or even from auth Promise resolve.
We can even split string and provide array with {name/separator} notation.
```
spreadBody: {
  hobbies: '{hobbies/, }' // "anime, eating sushi, manga" => hobbies: ['anime', 'eating sushi', 'manga']
}
```
## Create webhook
Very easy, just look at example :)
```
const { request } = require('elasticio-builder')
exports.startup = request({
  method: 'POST',
  url: 'https://{host}/subscription
})

exports.shutdown = request({
  method: 'DELETE',
  url: 'https://{host}/subscription
})

exports.process = function(msg, cfg) {
  try {
    this.emit('data', { body: msg.body })
  } catch (err) {
    // do some stuff
  }
}
```
You can use all stuff from previous section.
## Dynamic options in SelectView
We need some endpoint with schema for our SelectView control. For example api returns this schema:
```
{
  metadata: {
    size: 3
  },
  projects: [
    { 
      name: "elasticio", 
      display: { title: "Elastic.io project" }
    },
    {
      name: "star2star", 
      display: { title: "Star2Star project" }
    }
  ]
}
```
We can use it to create dynamic options for SelectView control like this:
```
{
  "elasticio": "Elastic.io project",
  "star2star": "Star2Star project"
}
```
Just use notation like this: {obj.arr[0].prop}. And provide all necessary info.
```
exports.genOptions = require('elasticio-builder').genSelectViewOptions({
  url: "https://{host}/schema",
  auth: {
    func: require('../verifyCredentials')
  },
  schemaPath: 'projects',
  valuePath: 'name', //relative to schemaPath
  titlePath: 'display.title' //relative to schemaPath
})
```
## Dynamic metadata
Something similar we can do to generate dynamic metadata schema.
```
exports.getMetaModel = require('elasticio-builder').genMetadata({
  url: "https://{host}/schema",
  auth: {
    func: require('../verifyCredentials')
  },
  schemaPath: 'projects',
  //relative to schemaPath
  namePath: 'name', 
  typePath: 'meta.type',
  propsPath: 'fields',  //for nested objects
  requiredPath: 'isRequired', 
  titlePath: 'meta.title',
  exclude: ['createdAt', 'updatedAt'] //exclude some fields
})
```
