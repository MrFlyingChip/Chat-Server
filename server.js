const express         = require('express');
const MongoClient     = require('mongodb').MongoClient;
const bodyParser      = require('body-parser');
const db              = require('./config/db');
const multer          = require('multer');
const cors = require('cors');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/' + req.id)
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload          = multer({storage: storage});
const app             = express();

const port = process.env.PORT || 8000;
app.use(bodyParser.json());
app.use(cors());
MongoClient.connect(db.url, (err, database) =>{
    if(err) return console.log(err);
    require('./app/routes')(app, database, upload);
    app.listen(port, () => {
        console.log('We are live on ' + port);
    });
});
