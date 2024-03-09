const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

//Basic Configuration
const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

mongoose.connect(uri)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.log('Error connecting to MongoDB', err));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Database Schema Configuration
const exerciseSchema = new mongoose.Schema( {
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: String,
  log: [exerciseSchema]
});
const user = mongoose.model('user', userSchema);

//POST user
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  checkUserName(username).then((data) => {
    if(data) {
      res.json({ error: 'Username already exists' });
    }
    else {
      user.create({ username: username }).then((data) => {
        res.json({ username: data.username, _id: data._id });
      })
    }
  })
});

//GET all users
app.get('/api/users', (req, res) => {
  user.find({})
  .then((data) => {
    const users = data.map((user) => ( 
      { username: user.username, _id: user._id }
    ));
    res.json(users);
  })
  .catch((err) => {
    res.json({ error: err });
  })
});

//Check if username exists
function checkUserName(username) {
  return user.findOne({ username: username }).then((data) => {
    if (data) {
      console.log('Username already exists');
      return true;
    }
    else {
      console.log('Username does not exist');
      return false;
    }
  });
}

//POST exercises
app.post('/api/users/:_id/exercises', (req, res) => {
  const _id = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = req.body.date;
  
  if (!date) {
    date = new Date().toDateString();
  }
  else {
    date = new Date(date).toDateString();
  }
  user.findById(_id).then((data) => {
    if (!data) {
      res.json({ error: 'User not found' });
    }
    else {
      let exercise = { description: description, duration: duration, date: date };
      let logExists = data.log.some((log) => (log.date === date && log.description === description && String(log.duration) === duration));
      if (logExists) {
        res.json({ error: 'Exercise already logged' });
      }
      else {
        data.log.push(exercise);
        data.save().then((updatedUser) => {
          const response = {
            _id: updatedUser._id,
            username: updatedUser.username,
            date: date,
            duration: Number(duration),
            description: description
          };
          res.json(response);
        })
        .catch((err) => {
          res.json({ error: err });
        });
      }
    }
  });
});

//GET Logs
app.get('/api/users/:_id/logs', (req, res) => {
  const _id = req.params._id;
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;
  user.findById(_id).then((data) => {
    if (!data) {
      res.json({ error: 'User not found' });
    }
    else {
      let log = data.log
      if (from) {
        log = log.filter((log) => new Date(log.date) >= new Date(from));
      }
      if (to) {
        log = log.filter((log) => new Date(log.date) <= new Date(to));
      }
      if (limit) {
        log = log.slice(0, limit);
      }
      res.json({
        _id: data._id,
        username: data.username,
        count: data.log.length,
        log: log
      });
    }
  });
});

const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
