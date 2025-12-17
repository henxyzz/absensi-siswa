const mongoose = require('mongoose')
const config = require('./config')

const connectDB = () => {
  if (!config || !config.mongodb || !config.mongodb.uri) {
    console.warn('  MONGODB_URI tidak diset')
    console.warn('  Aplikasi jalan tanpa database (DEMO MODE)')
    return false
  }

  // mongoose 4.x style
  mongoose.connect(config.mongodb.uri)

  mongoose.connection.on('connected', function () {
    console.log(' MongoDB Connected')
  })

  mongoose.connection.on('error', function (err) {
    console.error(' MongoDB Error:', err)
    console.warn('Database tidak tersedia')
  })

  return true
}

module.exports = connectDB
