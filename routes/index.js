var express = require("express");
var router = express.Router();
var User = require("../models/user");
var TwoFactorAuth = require("../models/twofactor");
var UserSession = require("../models/usersession");
var SearchHit = require("../models/search");
var Places = require("../models/places");

var Tourism = require("../models/tourism_data");

var nodemailer = require("nodemailer");
const fetch = require("node-fetch");
const uuidv1 = require("uuid/v1");

router.post("/register", function(req, res, next) {
  console.log(req.body);
  var userInfo = req.body;

  if (
    !userInfo.email ||
    !userInfo.username ||
    !userInfo.password ||
    !userInfo.dob ||
    !userInfo.gender
  ) {
    res.send({ code: "400", message: "Bad Request" });
  } else {
    User.findOne({ email: userInfo.email }, function(err, data) {
      if (!data) {
        var c;
        User.findOne({}, function(err, data) {
          if (data) {
            console.log("if");
            c = data.unique_id + 1;
          } else {
            c = 1;
          }

          var newUser = new User({
            unique_id: c,
            email: userInfo.email,
            username: userInfo.username,
            password: userInfo.password,
            gender: userInfo.gender,
            dob: userInfo.dob
          });

          newUser.save(function(err, Person) {
            if (err) console.log(err);
            else console.log("Success");
          });
        })
          .sort({ _id: -1 })
          .limit(1);
        res.send({ code: "200", message: "User registered successfully." });
      } else {
        res.send({
          code: "201",
          message: "User already registered with this email"
        });
      }
    });
  }
});

router.post("/verify-otp", function(req, res, next) {
  var req_data = req.body;
  TwoFactorAuth.findOne({ email: req_data.email }, function(err, data) {
    if (data) {
      if (data.otp == req_data.otp) {
        console.log("OTP Matched");
        TwoFactorAuth.deleteOne({ email: data.email }, function(err, data) {
          if (err) console.log(err);
          else console.log("OTP removed for user: " + data.email);
        });
        var session_id = uuidv1();
        console.log(session_id);
        var userSession = new UserSession({
          email: req_data.email,
          session_id: session_id
        });
        UserSession.findOne({ email: req_data.email }, function(err, data) {
          if (data) {
            UserSession.deleteOne({ email: req_data.email }, function(
              err,
              data
            ) {
              if (err) console.log(err);
              else console.log("OTP removed for user: " + data.email);
            });
          }
          userSession.save(function(err, Person) {
            if (err) console.log(err);
            else console.log("Session Created: " + req_data.email);
          });
        });

        res.send({
          code: "200",
          message: "OTP verified successfully.",
          session_id: session_id
        });
      } else {
        res.send({
          code: "204",
          message: "Incorrect OTP."
        });
      }
    } else {
      res.send({
        code: "205",
        message: "No entry for OTP in records."
      });
    }
  });
});

router.post("/send-otp", function(req, res, next) {
  console.log(req);
  var data = req.body;
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "dalcourselist@gmail.com",
      pass: "Dal@12345"
    }
  });

  var mailOptions = {
    from: "noreply@travel.com",
    to: data.email,
    subject: "travel app alert : One Time Password",
    text: "Your One Time Password to access the Travel App is : " + data.otp
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
      TwoFactorAuth.findOne({ email: data.email }, function(err, data) {
        if (data) {
          TwoFactorAuth.deleteOne({ email: data.email }, function(err, data) {
            if (err) console.log(err);
            else console.log("OTP removed for user: " + data.email);
          });
        }
      });
      var twoFactAuth = new TwoFactorAuth({
        email: data.email,
        otp: data.otp
      });
      twoFactAuth.save(function(err, Person) {
        if (err) console.log(err);
        else console.log("OTP saved for user:" + data.email);
      });
      j;
      res.send({
        code: "200",
        message: "OTP has been successfully sent to the registered email."
      });
    }
  });
});

router.post("/login", function(req, res, next) {
  User.findOne({ email: req.body.email }, function(err, data) {
    if (data) {
      if (data.password == req.body.password) {
        var req_object = {
          email: req.body.email,
          otp: Math.floor(100000 + Math.random() * 900000)
        };
        url = "http://" + "localhost" + ":3000/send-otp";
        var headers = {
          "Content-Type": "application/json"
        };
        fetch(url, {
          mode: "cors",
          method: "POST",
          headers: headers,
          body: JSON.stringify(req_object)
        })
          .then(res => {
            console.log(res.json());
          })
          .then(json => {});
        res.send({
          code: "200",
          message: "OTP has been successfully sent to the registered email."
        });
      } else {
        res.send({ code: "202", message: "Invalid Credentials." });
      }
    } else {
      res.send({ code: "203", message: "User not found" });
    }
  });
});

router.post("/search", function(req, res, next) {
  var search_text = req.body.search_text;
  var s_id = req.body.session_id;
  var resp_data = [];

  Places.find({ $text: { $search: search_text } }, function(err, data) {
    console.log(data);
    resp_data = data;
    console.log("after query");
    UserSession.findOne({ session_id: s_id }, function(err, data) {
      if (data) {
        var newSearchHit = new SearchHit({
          email: data.email,
          search_text: search_text
        });
        newSearchHit.save(function(err, Person) {
          if (err) console.log(err);
          else console.log("Search hit saved");
        });
      }
    });
    res.send({
      code: 200,
      message: resp_data.length + " Result(s) Found",
      data: resp_data
    });
  });
});

router.post("/logout", function(req, res, next) {
  var s_id = req.body.session_id;
  UserSession.findOne({ session_id: s_id }, function(err, data) {
    if (data) {
      UserSession.deleteOne({ email: data.email }, function(err, del_data) {
        if (err) console.log(err);
        else console.log("Session destroyed: " + data.email);
      });
      res.send({
        code: 200,
        message: "Session destroyed. Logout Successful."
      });
    } else {
      res.send({
        code: 200,
        message: "No active session for user."
      });
    }
  });
});

router.post("/user-search-history", function(req, res, next) {
  var s_id = req.body.session_id;
  UserSession.findOne({ session_id: s_id }, function(err, data) {
    var resp_data = [];
    if (data) {
      SearchHit.find({ email: data.email }, function(err, s_data) {
        resp_data = s_data;
        res.send({
          code: 200,
          message: resp_data.length + " Result(s) Found",
          data: resp_data
        });
      });
    } else {
      res.send({
        code: 200,
        message: "No active session for user.",
        data: resp_data
      });
    }
  });
});

router.post("/modes", function(req, res, next) {
  var source = req.body.src;
  var destination = req.body.dest;
  if (!source || !destination) {
    res.send({
      code: "400",
      data: [],
      message: "Bad Request"
    });
  } else {
    t = 355;
    let bus_options = Math.floor(Math.random() * (4 - 1) + 1);
    let modes_data = [];
    if (source == destination) {
      for (var i = 1; i <= bus_options; i++) {
        // Bus fare ranging from 50$ to 100$
        let bus_fare = Math.floor(Math.random() * (100 - 50) + 50);
        modes_data.push({
          mode: "bus",
          currency: "$",
          mode_fare: bus_fare + ".00",
          mode_id: "bus_" + i
        });
      }
      res.send({
        code: "200",
        message: "Travel options",
        data: modes_data
      });
    } else if (source != destination) {
      let flight_options = Math.floor(Math.random() * (4 - 1) + 1);
      for (var i = 1; i <= bus_options; i++) {
        // Bus fare ranging from 50$ to 100$
        let bus_fare = Math.floor(Math.random() * (100 - 50) + 50);
        modes_data.push({
          mode: "bus",
          currency: "$",
          mode_fare: bus_fare + ".00",
          mode_id: "bus_" + i
        });
      }
      for (var i = 1; i <= flight_options; i++) {
        let bus_fare = Math.floor(Math.random() * (100 - 50) + 50);
        bus_fare = Math.floor(bus_fare * 2.5);
        modes_data.push({
          mode: "flight",
          currency: "$",
          mode_fare: bus_fare + ".00",
          mode_id: "flight_" + i
        });
      }
      res.send({
        code: "200",
        message: "Travel options",
        data: modes_data
      });
    } else {
      res.send({
        code: "400",
        data: [],
        message: "Bad Request; Issue with source or destination"
      });
    }
  }
});

router.post("/get-all-provinces", function(req, res, next) {
  Tourism.find({}, { _id: 0 }, function(err, data) {
    if (data) {
      res.send({
        code: 200,
        data: data,
        message: "All the provinces in Canada"
      });
    } else if (err) {
      console.log("Error while fetching the data: " + err);
    }
  });
});

module.exports = router;
