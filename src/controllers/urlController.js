const urlModel = require("../models/urlModel")
const mongoose = require('mongoose')
const shortid = require('shortid');
const validUrl = require("valid-url");


const isValid = function (value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true;
}

const shortUrl = async function (req, res) {
    try {

        if (!Object.keys(req.body).length)return res.status(400).send({ status: false, message: "Please provide URL details" }); 
        
        if (!isValid(req.body.longUrl))return res.status(400).send({ status: false, message: "Please provide Long URL." });
        
        if (!/^(http(s)?:\/\/)?(www.)?([a-zA-Z0-9])+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,5}(:[0-9]{1,5})?(\/[^\s]*)?$/gm.test(req.body.longUrl.toString().trim())){ 
            return res.status(400).send({ status: false, message: "Please Provide a Valid Long URL." })}

        const checkLongUrl = await urlModel.findOne({ longUrl: req.body.longUrl }).select({ createdAt: 0, updatedAt: 0, __v: 0, _id: 0 });

        if (checkLongUrl) {
            
         res.status(200).send({ status: true, message: `Short URL already generated for this longURL.`, data: checkLongUrl });
        return
    }
        const shortCode = shortid.generate()
        const baseUrl = "http://localhost:3000";
        const shortUrl = baseUrl + "/" + shortCode;  

        const ShortenUrl = await urlModel.create({ longUrl: req.body.longUrl , shortUrl: shortUrl, urlCode: shortCode, });
        
     

        return res.status(201).send({ status: true, message: `Successfully Shorten the URL`, data: ShortenUrl, });

    } catch (err) {
        res.status(500).send({ status: false, error: err.message });
    }
}


const originalUrl = async function (req, res) {

    try {
        
       
        }

     catch (err) {
        
        res.status(500).send({ status: false, error: err.message });
    }
}










module.exports = { shortUrl,originalUrl}




