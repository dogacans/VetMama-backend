require('dotenv').config()

const BACKEND_HOST = process.env.BACKEND_HOST
const BACKEND_PORT = process.env.BACKEND_PORT

const DB_HOST = process.env.DB_HOST
const DB_PORT = process.env.DB_PORT
const DB_USER = process.env.DB_USER
const DB_PASS = process.env.DB_PASS
const DB_NAME = process.env.DB_NAME



module.exports = {
    BACKEND_HOST,
    BACKEND_PORT,
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASS,
    DB_NAME
}