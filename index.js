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

//creates Tables
mysql.createTables();

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

app.get("/DeleteSalesRecord", async function(req, res)
{
  res.render(path.join(__dirname + static_path + "deleteSales"));
});

app.post("/SalesRecordDeleted", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("DELETE FROM sales WHERE Sale_ID =  ('" + req.body.salesID + "');").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "salesRecordDeleted"));
  }
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

app.post("/ReturnSalesRecords", async function(req, res)
{
  var search_string = req.body.searchString;
  var search_date = req.body.searchDate;
  var start_date = req.body.startDate;
  var end_date = req.body.endDate;

  console.log(start_date);

  var output_string = "";

  if (search_date == "true")
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.selectData("SELECT * FROM sales JOIN item on sales.Item_ID = item.Item_ID JOIN item_types ON item_types.itmType_ID = item.Item_ID WHERE item.Item_Name LIKE '%" + search_string +
    "%' OR item_types.item_Type LIKE '%" + search_string + "%' AND sales.Sale_Date >= CONVERT('" + start_date + "', date) AND sales.Sale_Date <= CONVERT('" + end_date + "', date)").then(result => {

      result.forEach(function(element)
      {
        output_string += "<tr><td>" + element.Sale_ID + "</td><td>" + element.Quantity + "</td><td>" + element.Item_ID + "</td><td>" + element.Item_Name + "</td><td>" + element.Sale_Date + "</td></tr>";
      });

      if (output_string.length == 0)
      {
        output_string = "<p>No Results Found</p>";
      }

    });
  }
  else
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.selectData("SELECT * FROM sales JOIN item on sales.Item_ID = item.Item_ID JOIN item_types ON item_types.itmType_ID = item.Item_ID WHERE item.Item_Name LIKE '%" + search_string +
      "%' OR item_types.item_Type LIKE '%" + search_string + "%'").then(result => {

      result.forEach(function(element)
      {
        output_string += "<tr><td>" + element.Sale_ID + "</td><td>" + element.Quantity + "</td><td>" + element.Item_ID + "</td><td>" + element.Item_Name + "</td><td>" + element.Sale_Date + "</td></tr>";
      });

    });
  }

  res.render(path.join(__dirname + static_path + "returnSalesRecords"), {data: HTMLParser.parse(output_string)});
});


app.get("/DownloadCSV", async function(req, res)
{
  var start_date = req.query.startDate;
  var end_date = req.query.endDate;

  var output_string = "";

  start_date = start_date + "-00";

  if (end_date.length > 0)
  {
    end_date = end_date + "-00";
  }

  var output_string = "";

  console.log(end_date);

  if (end_date.length > 0)
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.selectData("SELECT * FROM sales JOIN item on sales.Item_ID = item.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE sales.Sale_Date >= CONVERT('" +
      start_date + "', date) AND sales.Sale_Date <= CONVERT('" + end_date + "', date)").then(result => {

      result.forEach(function(element)
      {
        output_string += element.Sale_ID + "," + element.Quantity + "," + element.Item_ID + "," + element.Item_Name + "," + element.Sale_Date + '\n';
      });

      if (output_string.length == 0)
      {
        output_string = "<p>No Results Found</p>";
      }
    });
  }
  else
  {
    //waits for the response for database, then continues, utilizing the response string
    var month = req.query.startDate.split("-")[1];
    var year = req.query.startDate.split("-")[0];
    var month = parseInt(month) + 1;

    if (month < 10)
    {
      month = "0" + month;
    }

    if (month > 13)
    {
      year = parseInt(year) + 1;
    }

    var final_start_date = year + "-" + month + "-00";

    await mysql.selectData("SELECT * FROM sales JOIN item on sales.Item_ID = item.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE sales.Sale_Date >= CONVERT('" +
      start_date + "', date) AND sales.Sale_Date <= CONVERT('" + final_start_date + "', date)").then(result => {

      result.forEach(function(element)
      {
        output_string += element.Sale_ID + "," + element.Quantity + "," + element.Item_ID + "," + element.Item_Name + "," + element.Sale_Date + '\n';
      });

      if (output_string.length == 0)
      {
        output_string = "<p>No Results Found</p>";
      }

    });
  }

  output_string = "Sales ID, Quantity, Item ID, Item Name, Sale Date" + '\n' + output_string;

  res.setHeader('Content-disposition', 'attachment; filename=shifts-report.csv');
  res.set('Content-Type', 'text/csv');
  res.status(200).send(output_string);
})


app.get("/GenerateSalesReport", function(req, res)
{
  res.render(path.join(__dirname + static_path + "generateSalesReport"));
});

app.get("/DisplaySalesReport", async function(req, res)
{
  var start_date = req.query.startDate;
  var end_date = req.query.endDate;

  start_date = start_date + "-00";

  if (end_date.length > 0)
  {
    end_date = end_date + "-00";
  }

  var output_string = "";

  console.log(end_date);

  if (end_date.length > 0)
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.selectData("SELECT * FROM sales JOIN item on sales.Item_ID = item.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE sales.Sale_Date >= CONVERT('" +
      start_date + "', date) AND sales.Sale_Date <= CONVERT('" + end_date + "', date)").then(result => {

      result.forEach(function(element)
      {
        output_string += "<tr><td>" + element.Sale_ID + "</td><td>" + element.Quantity + "</td><td>" + element.Item_ID + "</td><td>" + element.Item_Name + "</td><td>" + element.Sale_Date + "</td></tr>";
      });

      if (output_string.length == 0)
      {
        output_string = "<p>No Results Found</p>";
      }
    });
  }
  else
  {
    //waits for the response for database, then continues, utilizing the response string
    var month = req.query.startDate.split("-")[1];
    var year = req.query.startDate.split("-")[0];
    var month = parseInt(month) + 1;

    if (month < 10)
    {
      month = "0" + month;
    }

    if (month > 13)
    {
      year = parseInt(year) + 1;
    }

    var final_start_date = year + "-" + month + "-00";

    await mysql.selectData("SELECT * FROM sales JOIN item on sales.Item_ID = item.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE sales.Sale_Date >= CONVERT('" +
      start_date + "', date) AND sales.Sale_Date <= CONVERT('" + final_start_date + "', date)").then(result => {

      result.forEach(function(element)
      {
        output_string += "<tr><td>" + element.Sale_ID + "</td><td>" + element.Quantity + "</td><td>" + element.Item_ID + "</td><td>" + element.Item_Name + "</td><td>" + element.Sale_Date + "</td></tr>";
      });

      if (output_string.length == 0)
      {
        output_string = "<p>No Results Found</p>";
      }

    });
  }

  res.render(path.join(__dirname + static_path + "displaySalesReport"), {data: HTMLParser.parse(output_string)});
});



// -----------------------------------------------------------------------------------------
// -- Added by Alexander
// -----------------------------------------------------------------------------------------

// Manage Sales landing page
app.get("/ManageSales", function(req, res)
{
  res.render(path.join(__dirname + static_path + "manageSales"));
});

// View Records page
app.get("/ViewSaleRecords", async function(req, res)
{
  // Querey database and wait for result response
  // Returns ALL sales records and passes in array
  await mysql.selectData("SELECT * FROM sales").then(result => {
    
    // Render view and pass result of query to be displayed 
    res.render(path.join(__dirname + static_path + "ViewSaleRecords"), {SalesData: result});
  });
});

// -----------------------------------------------------------------------------------------
