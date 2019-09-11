"use strict";

const http = require('http');
const fileSystem = require('fs');
const express = require('express');
const path = require('path');
const app = express();
const api = express();

app.set('view engine', 'ejs');

const sql = require("mysql");
var config = {
    user: 'root',
    password: '',
    server: 'localhost',
    database: 'studyplanner'
};


//needed for getting form data
const bodyParser = require('body-parser')
const middlewares = [bodyParser.urlencoded()]
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())


const static_path = "/public/html/";


//app.use(express.static(__dirname + '/public'));


function executeQuery(query_string)
{
  con.connect(function(err) {
    if (err) throw err;
    con.query(query_string, function (err, result, fields) {
      if (err) throw err;
      console.log(result);
    });
  });
}


app.get("/AddSalesRecord", function(req, res)
{
  res.sendFile(path.join(__dirname + static_path + "addSales.html"));
});

app.post("/SalesRecordAdded", function(req, res)
{
  console.log(req.body.itemQuantity);
  console.log(req.body.salesDate);
  res.render(path.join(__dirname + static_path + "SalesRecordAdded"), {date: req.body.salesDate,quantity: req.body.itemQuantity});
});


const server = http.createServer(app);
server.listen(process.env.PORT || '3001', function () {
  console.log('Server app listening on port 3001!');
});
