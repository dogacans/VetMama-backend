const express = require('express')
const app = express()
const mysql = require('mysql2')
const middleware = require('./utils/middleware')
const compression = require('compression')
const cors = require('cors')
const knex = require('knex')({client: 'mysql2'})
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const bunyan = require('bunyan');
const morgan = require('morgan')
const proc = require('process')
// morgan(':method :url :status :res[content-length] - :response-time ms)
var log = bunyan.createLogger(
    {
        name: 'auctions-backend',
        streams: [
            {
                level: 'info',
                path: path.join(__dirname, 'info.log') 
            },
            {
                level: 'error',
                path: path.join(__dirname, 'error.log') 
            }
        ]
}
);

let accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags : 'a'})
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status - :response-time ms - :res[content-length] ":referrer" ":user-agent"', { stream: accessLogStream }))
app.use(compression())
app.use(cors())
app.use(express.json())
app.disable('x-powered-by');

log.info('Backend started.')

let auctions_db_pool;
if (process.platform === "linux") {
    auctions_db_pool = mysql.createPool({
        host: "localhost",
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        dateStrings: true
    })
}
else {
    auctions_db_pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        dateStrings: true
    })
}


const promisePool = auctions_db_pool.promise()

app.get('/', (request, response) => {
    response.status(200).send("Welcome to my feeds api!");
})
// app.get('/ages', async (request, response) => {
//     let agePromise = promisePool.execute('SELECT * FROM ages WHERE age != "unknown"');
//     let [a, b] = await agePromise;
//     response.status(200).json(a);
// })

app.get('/searchParameters/dog', async (request, response) => {
    let agePromise = promisePool.execute('SELECT id, age as name FROM ages WHERE age != "unknown"');
    let flavorPromise = promisePool.execute('SELECT id, flavor as name FROM flavors WHERE flavor != "unknown"');
    let kibbleSizePromise = promisePool.execute('SELECT id, size_name as name FROM kibble_sizes WHERE size_name != "unknown"');
    let specNamesPromise = promisePool.execute(`
    SELECT id, name  FROM spec_names 
    INNER JOIN specs on spec_names.id = specs.spec_id
    WHERE name != "unknown"
    AND spec_id IN (
        SELECT DISTINCT(spec_id) from specs 
        INNER JOIN feeds ON feeds.id = specs.feed_id
        WHERE feeds.species_id = 5)
    GROUP BY id, name
    `);
    let breedsPromise = promisePool.execute('SELECT id, breed as name FROM breeds WHERE breed != "unknown"');

    let [age, a] = await agePromise;
    let [flavor, b] = await flavorPromise;
    let [kibbleSize, c] = await kibbleSizePromise;
    let [specNames, d] = await specNamesPromise;
    let [breeds, e] = await breedsPromise;
    
    response.status(200).json(
        {
            "ages" : age,
            "flavors" : flavor,
            "kibbleSizes": kibbleSize,
            "specNames" : specNames,
            "breeds" : breeds
        }
    );
})

app.get('/searchParameters/cat', async (request, response) => {
    console.time("promise")
    let agePromise = promisePool.execute('SELECT id, age as name FROM ages WHERE age != "unknown"');
    let flavorPromise = promisePool.execute('SELECT id, flavor as name FROM flavors WHERE flavor != "unknown"');
    let kibbleSizePromise = promisePool.execute('SELECT id, size_name as name FROM kibble_sizes WHERE size_name != "unknown"');
    let specNamesPromise = promisePool.execute(`

        SELECT id, name  FROM spec_names 
        INNER JOIN specs on spec_names.id = specs.spec_id
        WHERE name != "unknown"
        AND spec_id IN (
            SELECT DISTINCT(spec_id) from specs 
            INNER JOIN feeds ON feeds.id = specs.feed_id
            WHERE feeds.species_id = 6)
        GROUP BY id, name

    `);
    let breedsPromise = promisePool.execute('SELECT id, breed as name FROM breeds WHERE breed != "unknown"');
    console.timeEnd("promise")
    
    
    console.time("await")
    let [age, a] = await agePromise;
    let [flavor, b] = await flavorPromise;
    let [kibbleSize, c] = await kibbleSizePromise;
    let [specNames, d] = await specNamesPromise;
    let [breeds, e] = await breedsPromise;
    console.timeEnd("await")
    
    response.status(200).json(
        {
            "ages" : age,
            "flavors" : flavor,
            "kibbleSizes": kibbleSize,
            "specNames" : specNames,
            "breeds" : breeds
        }
    );
})



app.get('/searchFeed/dog', async (request, response) => {

    let searchQuery = knex('feeds')
        .join('specs', 'specs.feed_id', '=', 'feeds.id')
        .join('packaging', 'packaging.feed_id', '=', 'feeds.id')
        .join('breeds', 'feeds.breed_id', '=', 'breeds.id')
        .join('brands', 'brands.id', '=', 'feeds.brand_id')
    
    for (let i = 0; i < Object.keys(request.query).length; i++) {
        if (Object.keys(request.query)[i] === "specs"){
            searchQuery = searchQuery.where("spec_id", parseInt(Object.values(request.query)[i]))
        }
        else if (Object.keys(request.query)[i] === "breedSize"){
            searchQuery = searchQuery.where("breeds.id", parseInt(Object.values(request.query)[i]))
        }
        else {
            searchQuery = searchQuery.where(Object.keys(request.query)[i], parseInt(Object.values(request.query)[i]))
        }
    }  

    // Filter for dogs
    searchQuery = searchQuery.where("species_id", 5)
    
    let feedsPromise = promisePool.execute(searchQuery.toString());
    let [feed_rows, feed_fields] = await feedsPromise;

    response.status(200).json(
        feed_rows
    );
})

app.get('/searchFeed/cat', async (request, response) => {

    let searchQuery = knex('feeds')
        .join('specs', 'specs.feed_id', '=', 'feeds.id')
        .join('packaging', 'packaging.feed_id', '=', 'feeds.id')
        .join('breeds', 'feeds.breed_id', '=', 'breeds.id')
        .join('brands', 'brands.id', '=', 'feeds.brand_id')
    
    for (let i = 0; i < Object.keys(request.query).length; i++) {
        if (Object.keys(request.query)[i] === "specs"){
            searchQuery = searchQuery.where("spec_id", parseInt(Object.values(request.query)[i]))
        }
        else if (Object.keys(request.query)[i] === "breedSize"){
            searchQuery = searchQuery.where("breeds.id", parseInt(Object.values(request.query)[i]))
        }
        else {
            searchQuery = searchQuery.where(Object.keys(request.query)[i], parseInt(Object.values(request.query)[i]))
        }
    }  

    // Filter for cats
    searchQuery = searchQuery.where("species_id", 6)
    
    let feedsPromise = promisePool.execute(searchQuery.toString());
    let [feed_rows, feed_fields] = await feedsPromise;

    response.status(200).json(
        feed_rows
    );
})

app.get('/getFeedContent/:feed_id', async (request, response) => {

    let feedSearchQuery = knex('feed_contents').where("feed_id", request.params.feed_id)
    
    let feedContentPromise = promisePool.execute(feedSearchQuery.toString());
    let [feed_content_rows, feed_fields] = await feedContentPromise;

    let packagingSearchQuery = knex('packaging').join('brands', 'brands.id', '=', 'packaging.brand_id').where("feed_id", request.params.feed_id)
    
    let packagingPromise = promisePool.execute(packagingSearchQuery.toString());
    let [packaging_rows, packaging_fields] = await packagingPromise;
    response.status(200).json(
        [feed_content_rows,
        packaging_rows]
    );
})

app.use(middleware.unknownEndpoint)

module.exports = app
