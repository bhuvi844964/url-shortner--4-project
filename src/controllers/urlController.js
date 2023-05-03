const validUrl = require('valid-url');
const shortid = require('shortid');
const urlModel = require('../models/urlModel');
const { promisify } = require('util');
const redis = require('redis');

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.PASSWORD,
};


const redisClient = redis.createClient(redisConfig);
redisClient.on('connect', () => {
  console.log('Connected to Redis');
});
const SET_ASYNC = promisify(redisClient.set).bind(redisClient);
const GET_ASYNC = promisify(redisClient.get).bind(redisClient);

const isValid = function (value) {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  return true;
};

const createUrl = async function (req, res) {
  try {
    if (!req.body || !Object.keys(req.body).length)
      return res
        .status(400)
        .send({ status: false, message: 'Please provide URL details' });
    const longUrl = req.body.longUrl;
    if (!isValid(longUrl))
      return res
        .status(400)
        .send({ status: false, message: 'Please provide a valid long URL' });
    if (!validUrl.isUri(longUrl))
      return res
        .status(400)
        .send({ status: false, message: 'Please provide a valid URL' });

    const cachedLongUrl = await GET_ASYNC(longUrl);
    const parsedUrl = JSON.parse(cachedLongUrl);

    if (parsedUrl)
      return res.status(201).send({ status: true, data: parsedUrl });

    const checkLongUrl = await urlModel
      .findOne({ longUrl })
      .select({ createdAt: 0, updatedAt: 0, __v: 0, _id: 0 });

    if (checkLongUrl)
      return res
        .status(200)
        .send({
          status: true,
          message: 'Short URL already generated for this long URL',
          data: checkLongUrl,
        });

    const urlCode = shortid.generate();
    const baseUrl = 'http://localhost:3000';
    const shortUrl = `${baseUrl}/${urlCode}`;
    const collection = {
      urlCode,
      longUrl,
      shortUrl,
    };

    const shortenedUrl = await urlModel.create(collection);
    const result = {
      urlCode: shortenedUrl.urlCode,
      longUrl: shortenedUrl.longUrl,
      shortUrl: shortenedUrl.shortUrl,
    };

    await SET_ASYNC(longUrl, JSON.stringify(result));

    return res.status(201).send({
      status: true,
      message: 'Successfully shortened the URL',
      data: result,
    });

    } catch (err) {
        res.status(500).send({ status: false, error: err.message });
    }
}



//==================================================get Url==========================================//

const getUrl = async function (req, res) {
  try {
    const urlCode = req.params.urlCode;

    // Check if urlCode is a valid shortid
    if (!shortid.isValid(urlCode)) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide a valid urlCode." });
    }

    // Check if the longUrl is cached
    let cachedData = await GET_ASYNC(urlCode);
    if (cachedData) {
      const { longUrl } = JSON.parse(cachedData);
      return res.status(302).redirect(longUrl);
    }

    // If not cached, query the database for the longUrl
    const originalUrlData = await urlModel.findOne({ urlCode });
    if (!originalUrlData) {
      return res
        .status(404)
        .send({ status: false, message: "URL not found." });
    }

    // Cache the longUrl
    await SET_ASYNC(urlCode, JSON.stringify(originalUrlData));

    // Redirect to the longUrl
    res.status(302).redirect(originalUrlData.longUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send({ status: false, error: err.message });
  }
};


module.exports.createUrl = createUrl
module.exports.getUrl = getUrl
