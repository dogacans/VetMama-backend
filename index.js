const app = require('./app') // the actual Express application
const http = require('http')
require('dotenv').config()

const server = http.createServer(app)

server.listen(3001, () => {
  console.log(`Server running on port ${process.env.BACKEND_PORT}`)
})
