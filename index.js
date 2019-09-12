"use strict";

const http = require('http');
const fileSystem = require('fs');
const express = require('express');
const path = require('path');
const HTMLParser = require('node-html-parser');

//creates express app
const app = express();

app.set('view engine', 'ejs');

//gets seperate js file for sql commands, etc
const mysql = require("./scripts/Create_Script.js");

//needed for getting form data
const bodyParser = require('body-parser')
const middlewares = [bodyParser.urlencoded()]
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

//where all of the static 'html' or 'ejs' data is stored
const static_path = "/public/html/";

//app.use(express.static(__dirname + '/public'));

//creates the DB
mysql.createDB();

app.get("/AddItem", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.selectData("SELECT * FROM item_types").then(result => {

    var options_string = "";

    result.forEach(function(element)
    {
      options_string += "<option value=" + element.itmType_ID + ">" + element.item_Type + "</option>";
    });

    //renders ejs doc as html, replace document variables with options for the select field
    res.render(path.join(__dirname + static_path + "addItem"), {options: HTMLParser.parse(options_string)});
  });
});

app.post("/ItemAdded", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("INSERT INTO item (Item_Name, Price, itmType_ID) VALUES ('" + req.body.itemName + "'," + req.body.itemPrice + "," + req.body.itemType + ");").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "itemAdded"), {name: req.body.itemName});
  }
  });
});

app.get("/AddSalesRecord", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.selectData("SELECT * FROM item").then(result => {
    console.log(result);

    var options_string = "";

    result.forEach(function(element)
    {
      console.log(element.item_Type);
      options_string += "<option value=" + element.Item_ID + ">" + element.Item_Name + "</option>";
    });

    res.render(path.join(__dirname + static_path + "addSales"), {options: HTMLParser.parse(options_string)});

  });
});

app.post("/SalesRecordAdded", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("INSERT INTO sales (Item_ID, Sale_Date, Quantity) VALUES ('" + req.body.itemID + "'," + req.body.salesDate + "," + req.body.itemQuantity + ");").then(result => {
  res.render(path.join(__dirname + static_path + "salesRecordAdded"), {date: req.body.salesDate,quantity: req.body.itemQuantity});
  });
});

const server = http.createServer(app);
server.listen(process.env.PORT || '3001', function () {
  console.log('Server app listening on port 3001!');
});
