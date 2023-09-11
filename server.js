var express = require("express");
var bodyParser = require('body-parser')
const cors = require('cors')
const multer  = require('multer')
require('dotenv').config()
const mysql = require('mysql2');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3')
const axios = require('axios');
const app = express();
var server = require('http').createServer(app);
const socketio = require('socket.io')(server);
const config = require('./config');
const port = 3002;
const moment = require('moment-timezone');



app.use(cors());
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static("public"));

server.listen(port, () => {
  console.log(`App running on port ${port}`);
});


const connection = mysql.createConnection({
  host: 'db-mysql-do-user-13182457-0.b.db.ondigitalocean.com',
  user: 'doadmin',
  password: 'AVNS_5-MVZDAv8ZiOuSoBAu7',
  database: 'learnsbuy',
  port: 25060,
  timezone: '+07:00'
});

connection.connect((err) => {
  if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
  }
  console.log('Connected to MySQL database');
});

aws.config.update({
  endpoint: config.spacesEndpoint,
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
});

const s3 = new aws.S3();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', upload.single('img'), (req, res) => {

  const file = req.file;
  const params = {
    Bucket: config.bucketName,
    Key: file.originalname,
    Body: file.buffer,
    ACL: 'public-read',
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Error uploading file:', err);
      res.status(500).json({ error: 'Error uploading file' });
    } else {
      console.log('File uploaded successfully. File location:', data.Location);
      res.json({ message: 'File uploaded successfully', fileUrl: data.Location, user_id: req.body.user_id });
    }
  });
});

app.get("/", (req, res) => {

  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const offset = (page - 1) * limit;
  console.log('get data page ', page)
  //const query = `SELECT * FROM messages ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  const query = `SELECT * FROM messages ORDER BY created_at DESC`;
  connection.query(query, (error, results) => {
    if (error) {
      throw error;
    }
    // Convert the results to JSON
    const jsonData = (results);

    res.send({'data': jsonData});
  });
  
});

app.get("/listChat", (req, res) => {

  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const offset = (page - 1) * limit;
  // const query = `SELECT * FROM messages GROUP BY chat_user_id ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  const query = `SELECT m.* FROM messages AS m JOIN ( SELECT chat_user_id, MAX(created_at) AS max_created_at FROM messages WHERE chat_user_id != 1 GROUP BY chat_user_id ) AS subquery ON m.chat_user_id = subquery.chat_user_id AND m.created_at = subquery.max_created_at ORDER BY m.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  connection.query(query, (error, results) => {
    if (error) {
      throw error;
    }
    // Convert the results to JSON
    const jsonData = (results);

    res.send({'data': jsonData});
  });
  
});

app.post('/index_2', upload.single('img'), (req, res) => {

  var bangkokTime = moment().tz('Asia/Bangkok');
    const datatype = req.body.message_type;
    let image = null;

    if(req.body.noti_status == 1){
      console.log(`Send Noti to ${req.body.fcmToken}`);

      // Replace with your FCM server key and the device's registration token
      const serverKey = 'AAAAq_DuXyE:APA91bGNQAxcI2ACm62Z4qv-iNu_4dBz0M0KcPc4wnsnLmvCIUOQmMZ6erBIFkCWUgEq3GbKf24PLOeW_M9G4OhNH5lVQe2kiVvUWGa2abSAC0ekAbKl6HlxNejObQpY8nWn9OJnw645';
      const registrationToken = req.body.fcmToken;

      // Define the FCM API endpoint
      const fcmEndpoint = 'https://fcm.googleapis.com/fcm/send';

      // Define the notification payload
      const notificationPayload = {
        registration_ids: [ `"${registrationToken}"`],
        notification: {
          title: 'ข้อความจาก Learnsbuy',
          body: `"${req.body.message_in}"`,
        },
      };

      // Send the POST request to FCM
      axios({
        method: 'post',
        url: fcmEndpoint,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${serverKey}`,
        },
        data: JSON.stringify(notificationPayload),
      })
        .then((response) => {
          console.log('Notification sent successfully:', response.data);
        })
        .catch((error) => {
          console.error('Error sending notification:', error);
        });
    }

    if(datatype == 'DataText'){

      var query = "INSERT INTO messages (chat_user_id, agent_id, message,	seen, message_type, image, user_id, user_name, user_avatar, created_at, updated_at) VALUES (" + req.body.user_id + ", " + req.body.agent_id + ", '" + req.body.message_in + "',0, '" + req.body.message_type + "', NULL, '" + req.body.user_id + "', '" + req.body.name + "', '" + req.body.avatar + "', '" +bangkokTime.format('YYYY-MM-DD HH:mm:ss') +"', '" +bangkokTime.format('YYYY-MM-DD HH:mm:ss') +"')";
      connection.query(query, (error, results) => {
        if (error) { throw error; }

    console.log("user_id", req.body.user_id);
    var date = new Date();

    var min = Math.ceil(10);
    var max = Math.floor(99);

    socketio.emit('new_message', {
        id: Math.floor(Math.random() * (max - min)) + min,
        timer: date,
        name: req.body.name,
        avatar: req.body.avatar,
        provider: req.body.provider,
        check_noti: 0,
        chat_user_id: parseInt(req.body.user_id, 10),
        message_in: req.body.message_in,
        message_type: req.body.message_type,
        agent_id: req.body.agent_id,
        playerid: req.body.playerid,
        image: null
      });
      res.json({'status' : 200, 'datatype' : datatype, 'image' : image , 'data' : bangkokTime.format('YYYY-MM-DD HH:mm:ss') });
      });
    }


    if(datatype == 'DataImage'){
      

      const file = req.file;
      console.log('file', file)
      console.log('req.body', req.body.message_type)
  const params = {
    Bucket: config.bucketName,
    Key: file.originalname,
    Body: file.buffer,
    ACL: 'public-read',
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Error uploading file:', err);
      res.status(500).json({ error: 'Error uploading file' });
    } else {
      
      
      var query = "INSERT INTO messages (chat_user_id, agent_id, message,	seen, message_type, image, user_id, user_name, user_avatar, created_at, updated_at) VALUES (" + req.body.user_id + ", " + req.body.agent_id + ", '" + req.body.message_in + "',0, '" + req.body.message_type + "', '"+ data.Location +"', '" + req.body.user_id + "', '" + req.body.name + "', '" + req.body.avatar + "', '" +bangkokTime.format('YYYY-MM-DD HH:mm:ss') +"', '" +bangkokTime.format('YYYY-MM-DD HH:mm:ss') +"')";
      connection.query(query, (error, results) => {
        if (error) { throw error; }

    console.log("user_id", req.body.user_id);
    var date = new Date();

    var min = Math.ceil(10);
    var max = Math.floor(99);

    socketio.emit('new_message', {
        id: Math.floor(Math.random() * (max - min)) + min,
        timer: date,
        name: req.body.name,
        avatar: req.body.avatar,
        provider: req.body.provider,
        check_noti: 0,
        chat_user_id: parseInt(req.body.user_id, 10),
        message_in: req.body.message_in,
        message_type: req.body.message_type,
        agent_id: req.body.agent_id,
        playerid: req.body.playerid,
        image: data.Location
      });
      res.json({'status' : 200, 'datatype' : datatype, 'image' : data.Location , 'data' : req.body.message_in});
      });


    }
  });

      
    }


    if(datatype == 'DataFile'){
      

      const file = req.file;
      console.log('file', file)
      console.log('req.body', req.body.message_type)
  const params = {
    Bucket: config.bucketName,
    Key: file.originalname,
    Body: file.buffer,
    ACL: 'public-read',
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Error uploading file:', err);
      res.status(500).json({ error: 'Error uploading file' });
    } else {
      
      
      var query = "INSERT INTO messages (chat_user_id, agent_id, message,	seen, message_type, image, user_id, user_name, user_avatar, created_at, updated_at) VALUES (" + req.body.user_id + ", " + req.body.agent_id + ", '" + req.body.message_in + "',0, '" + req.body.message_type + "', '"+ data.Location +"', '" + req.body.user_id + "', '" + req.body.name + "', '" + req.body.avatar + "', '" +bangkokTime.format('YYYY-MM-DD HH:mm:ss') +"', '" +bangkokTime.format('YYYY-MM-DD HH:mm:ss') +"')";
      connection.query(query, (error, results) => {
        if (error) { throw error; }

    console.log("user_id", req.body.user_id);
    var date = new Date();

    var min = Math.ceil(10);
    var max = Math.floor(99);

    socketio.emit('new_message', {
        id: Math.floor(Math.random() * (max - min)) + min,
        timer: date,
        name: req.body.name,
        avatar: req.body.avatar,
        provider: req.body.provider,
        check_noti: 0,
        chat_user_id: parseInt(req.body.user_id, 10),
        message_in: req.body.message_in,
        message_type: req.body.message_type,
        agent_id: req.body.agent_id,
        playerid: req.body.playerid,
        image: data.Location
      });
      res.json({'status' : 200, 'datatype' : datatype, 'file' : data.Location , 'data' : req.body.message_in});
      });


    }
  });

      
    }


    

});




