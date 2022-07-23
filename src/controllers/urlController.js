const validUrl = require('valid-url')
const shortid = require('shortid')
const urlModel = require("../models/urlModel")
const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
    14838,
  "redis-14838.c301.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("Grh8xogn2t211pGPqecH3W9abxhfwtWO", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});


const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

//===========================================Validation=========================================//

const isValid=function(value){
    if(typeof value === 'undefined' || value === null) return false
    if(typeof value !== 'string' || value.trim().length === 0) return false
    return true;
} 

//============================================Url Api's=========================================//

const createUrl = async function (req, res) {
    try {
let data = req.body;
let longUrl = data.longUrl
        if (!Object.keys(data).length)return res.status(400).send({ status: false, message: "Please provide URL details" }); 
        
        if (!isValid(data.longUrl))return res.status(400).send({ status: false, message: "Please provide Long URL." });
        
        if (!validUrl.isUri(longUrl)) {
            return res.status(400).send({ status: false, message: "Please provide a valid Url" })
        }

        const cachedlongUrl = await GET_ASYNC(`${data.longUrl}`); 

        const parsedUrl=JSON.parse(cachedlongUrl)

        if (parsedUrl) return res.status(201).send(parsedUrl);       /*Checking Data From Cache */
        
        const checkLongUrl = await urlModel.findOne({ longUrl: data.longUrl }).select({ createdAt: 0, updatedAt: 0, __v: 0, _id: 0 }); /*Checking Data From urlModel */

        if (checkLongUrl) {
            
         res.status(200).send({ status: true, message: `Short URL already generated for this longURL.`, data: checkLongUrl });
        return
    }

        const urlCode = shortid.generate()
        const baseUrl = "http://localhost:3000";
        const shortUrl = baseUrl + "/" + urlCode;  /*Concat base baseURL & URLcode*/
        let collection = {
          urlCode: urlCode,
          longUrl: longUrl,
          shortUrl: shortUrl
      }

        const ShortenUrl = await urlModel.create(collection);
        let result = {
          urlCode: ShortenUrl.urlCode,
          longUrl: ShortenUrl.longUrl,
          shortUrl: ShortenUrl.shortUrl
      }
        
        await SET_ASYNC(`${req.body.longUrl}`, JSON.stringify(result));

        return res.status(201).send({ status: true, message: `Successfully Shorten the URL`, data: result });

    } catch (err) {
        res.status(500).send({ status: false, error: err.message });
    }
}



//==================================================get Url==========================================//

const getUrl = async function (req, res) {

    try {
        
        if (!shortid.isValid(`${req.params.urlCode}`)) return res.status(400).send({ status: false, message: "Please provide Correct urlCode." }); /*Checking Data From Cache */

        let cachedShortId = await GET_ASYNC(`${req.params.urlCode}`);

        let parsedShortId=JSON.parse(cachedShortId)

        if (parsedShortId) return res.status(302).redirect(parsedShortId.longUrl); /*Checking Data From Cache */
        
        const originalUrlData = await urlModel.findOne({ urlCode: req.params.urlCode });
       
        if (originalUrlData) {

            await SET_ASYNC(`${req.params.urlCode}`, JSON.stringify(originalUrlData));
            res.status(302).redirect(originalUrlData.longUrl);
            return

        } else {

            return res.status(404).send({ status: false, msg: "No URL Found" });
        }

    } catch (err) {
        
        res.status(500).send({ status: false, error: err.message });
    }
}





module.exports.createUrl = createUrl
module.exports.getUrl = getUrl
