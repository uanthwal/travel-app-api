var express = require("express");
var router = express.Router();
var User = require("../models/user");
var TwoFactorAuth = require("../models/twofactor");
var UserSession = require("../models/usersession");
var nodemailer = require("nodemailer");
var http = require("http");
const fetch = require("node-fetch");
import { v1 as uuidv1 } from "uuid";

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
  console.log(req);
  var req_data = req.body;
  TwoFactorAuth.findOne({ email: req_data.email }, function(err, data) {
    if (data) {
      if (data.otp == req_data.otp) {
        TwoFactorAuth.deleteOne({ email: data.email }, function(err, data) {
          if (err) console.log(err);
          else console.log("OTP removed for user: " + data.email);
        });
        var session_id = uuidv1();
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

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);

      var twoFactAuth = new TwoFactorAuth({
        email: data.email,
        otp: data.otp
      });
      twoFactAuth.save(function(err, Person) {
        if (err) console.log(err);
        else console.log("OTP saved for user:" + data.email);
      });
      res.send({
        code: "200",
        message: "OTP has been successfully sent to the registered email."
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
      });j
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

router.get("/profile", function(req, res, next) {
  console.log("profile");
  User.findOne({ unique_id: req.session.userId }, function(err, data) {
    console.log("data");
    console.log(data);
    if (!data) {
      res.redirect("/");
    } else {
      //console.log("found");
      return res.render("data.ejs", { name: data.username, email: data.email });
    }
  });
});

router.get("/logout", function(req, res, next) {
  console.log("logout");
  if (req.session) {
    // delete session object
    req.session.destroy(function(err) {
      if (err) {
        return next(err);
      } else {
        return res.redirect("/");
      }
    });
  }
});

router.get("/forgetpass", function(req, res, next) {
  res.render("forget.ejs");
});

router.post("/forgetpass", function(req, res, next) {
  //console.log('req.body');
  //console.log(req.body);
  User.findOne({ email: req.body.email }, function(err, data) {
    console.log(data);
    if (!data) {
      res.send({ Success: "This Email Is not regestered!" });
    } else {
      // res.send({"Success":"Success!"});
      if (req.body.password == req.body.passwordConf) {
        data.password = req.body.password;
        data.passwordConf = req.body.passwordConf;

        data.save(function(err, Person) {
          if (err) console.log(err);
          else console.log("Success");
          res.send({ Success: "Password changed!" });
        });
      } else {
        res.send({
          Success: "Password does not matched! Both Password should be same."
        });
      }
    }
  });
});

module.exports = router;
