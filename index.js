
require('dotenv').config()

const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
var urls = require('./urls.json');

app.set("view engine", "ejs");
app.use((req, res, next) => {
    const cfConnectingIp = req.headers['cf-connecting-ip'];
    const cfTrueClientIp = req.headers['x-forwarded-for'];
    const clientIp = cfConnectingIp || cfTrueClientIp || req.socket.remoteAddress;
    req.clientIp = clientIp;
    next();
});
app.use(compression());
app.use(express.static('public'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.originAgentCluster());
app.use(helmet.referrerPolicy());


app.get("/", async (req,res) => {
    res.render("index.ejs", {error:null, success:null});
})


app.get("/:urlHash([a-zA-Z0-9]+)", async (req,res) => {
    const urlH = req.params.urlHash;
    const matchingObject = urls.find(obj => obj.urlHash === urlH);

    if(!matchingObject) {
        res.render("index.ejs", {error:"URL not found :(", success:null});
    }
    else if(matchingObject.expDate != 0 && matchingObject.expDate <= new Date().getTime()) {
        res.render("index.ejs", {error:"URL has expired. :(", success:null});
    }
    else {
        res.redirect(matchingObject.ogUrl);
    }
})

app.post('/generateUrl', async (req, res) => {
    let url = req.body.url;
    let api = req.body.usingAPI ? true : false;
    let existingData = [];
    let gUrl = generateRandomString(10);

    const filePath = 'urls.json';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    existingData = JSON.parse(fileContent);

    const newData = {
        "ogUrl": url,
        "date": new Date().getTime(),
        "urlHash": gUrl,
        "ip": req.clientIp,
        "expDate": req.body.date != '' ? Date.parse(req.body.date) : 0,
    }

    existingData.push(newData);
    const updatedJsonData = JSON.stringify(existingData, null, 0);
    fs.writeFileSync(filePath, updatedJsonData);

    if(api) {
        !url ? res.render('index.ejs',{error: "no URL provided :(.", success:null}) : res.render('index.ejs',{error: null, success:`URL successfully shortened, url : ${process.env.URL+'/'+gUrl}`});
    }
    else {
        !url ? res.status(500).json({"success": false, "msg": "no_url_provided"}) :  res.status(200).json({"success": true, "msg": "success_uploaded", "url": process.env.URL+'/'+gUrl});
    }

})

app.all('*', (req, res) => {
    res.status(404).render("index.ejs", {error:`Not found :(.`,success:null});
});


app.listen(process.env.PORT);

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
    }
    return randomString;

}    