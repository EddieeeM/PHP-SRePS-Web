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

app.use(express.static(__dirname + '/public'));

//creates the DB
mysql.createDB();

//essentially index for page
app.get("/", function(req, res)
{
  res.render(path.join(__dirname + static_path + "index"));
});

app.get("/AddItemType", function(req, res)
{
  res.render(path.join(__dirname + static_path + "addItemType"));
});

app.post("/ItemTypeAdded", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("INSERT INTO item_types (item_Type) VALUES ('" + req.body.typeName + "');").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "itemTypeAdded"), {name: req.body.typeName});
  }
  });
});

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

app.get("/DeleteItem", async function(req, res)
{
  
    res.render(path.join(__dirname + static_path + "deleteItem"));
 
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

app.post("/ItemDeleted", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("DELETE FROM item WHERE Item_Name =  ('" + req.body.itemName + "');").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "itemDeleted"), {name: req.body.itemName});
  }
  });
});

app.get("/AddSalesRecord", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.selectData("SELECT * FROM item").then(result => {

    var options_string = "";

    result.forEach(function(element)
    {
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

app.get("/SearchSalesRecord", async function(req, res)
{
  res.render(path.join(__dirname + static_path + "searchSalesRecord"));
});

app.post("/ReturnSalesRecord", async function(req, res)
{
  var search_string = req.body.searchString;
  var search_date = req.body.searchDate;
  var start_date = req.body.startDate;
  var end_date = req.body.endDate;

  console.log(start_date);

  if (search_date == "true")
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.selectData("SELECT * FROM sales JOIN item on sales.Item_ID = item.Item_ID JOIN item_types ON item_types.itmType_ID = item.Item_ID WHERE item.Item_Name LIKE '%" + search_string + "%' OR item_types.item_Type LIKE '%" + search_string + "%' AND sales.Sale_Date >= " + start_date + " AND sales.Sale_Date <= " + end_date).then(result => {

      var output_string = "";

      result.forEach(function(element)
      {
        output_string += "<p>Sale Number: " + element.Sale_ID + " | Quantity: " + element.Quantity + " Item: " + element.Item_Name + "</p>";
      });

      if (output_string.length == 0)
      {
        output_string = "<p>No Results Found</p>";
      }

      res.render(path.join(__dirname + static_path + "returnSalesRecord"), {data: HTMLParser.parse(output_string)});
    });
  }
  else
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.selectData("SELECT * FROM sales JOIN item on sales.Item_ID = item.Item_ID JOIN item_types ON item_types.itmType_ID = item.Item_ID WHERE item.Item_Name LIKE '%" + search_string + "%' OR item_types.item_Type LIKE '%" + search_string + "%'").then(result => {

      var output_string = "";

      result.forEach(function(element)
      {
        output_string += "<p>Sale Number: " + element.Sale_ID + " | Quantity: " + element.Quantity + " Item: " + element.Item_Name + "</p>";
      });

      res.render(path.join(__dirname + static_path + "returnSalesRecord"), {data: HTMLParser.parse(output_string)});
    });
  }
});
