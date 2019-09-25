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
  await mysql.selectData("SELECT * FROM item_types ORDER BY item_types.item_Type").then(result => {

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

app.post("/ItemDeleted", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("DELETE FROM item WHERE Item_ID =  ('" + req.body.itemID + "');").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "itemDeleted"), {name: req.body.itemName,itemID: req.body.itemID});
  }
  });
});

app.get("/AddSalesRecord", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.selectData("SELECT * FROM item ORDER BY item.Item_Name").then(result => {

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
  await mysql.insertData("INSERT INTO sales (Sale_ID, Sale_Date, Quantity) VALUES ('" + req.body.sale_ID + "','" + req.body.salesDate + "'," + req.body.itemQuantity + ");").then(result => {
  res.render(path.join(__dirname + static_path + "salesRecordAdded"), {date: req.body.salesDate,quantity: req.body.itemQuantity});
  });
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

app.get("/ManageItems", function(req, res)
{
  res.render(path.join(__dirname + static_path + "manageItems"));
});

app.get("/ManageItemTypes", function(req, res)
{
  res.render(path.join(__dirname + static_path + "manageItemTypes"));
});

// View Items page
app.get("/ViewItemRecords", async function(req, res)
{
  // Querey database and wait for result response
  // Returns ALL sales records and passes in array
  await mysql.selectData("SELECT * FROM item JOIN item_types ON item.itmType_ID = item_types.itmType_ID").then(result => {

    // Render view and pass result of query to be displayed
    res.render(path.join(__dirname + static_path + "ViewItemRecords"), {ItemData: result});
  });
});

app.get("/ViewItemTypeRecords", async function(req, res)
{
  // Querey database and wait for result response
  // Returns ALL sales records and passes in array
  await mysql.selectData("SELECT * FROM item_types").then(result => {

    // Render view and pass result of query to be displayed
    res.render(path.join(__dirname + static_path + "ViewItemTypeRecords"), {ItemData: result});
  });
});

app.get("/Contact", function(req, res)
{
  res.render(path.join(__dirname + static_path + "contact"));
});

app.get("/DeleteSalesRecord", async function(req, res)
{
  var saleID = req.query.saleID;

  mysql.selectData("SELECT * FROM sales JOIN item ON sales.Item_ID = item.Item_ID WHERE Sale_ID = '" + saleID +
  "'").then(itemResult =>
  {
    var sale_obj;
    itemResult.forEach(function(element)
    {
      sale_obj = element;
      //renders ejs doc as html, replace document variables with options for the select field
    });

    res.render(path.join(__dirname + static_path + "deleteSales"), {saleIDValue: "value = '" + sale_obj.Sale_ID + "'", saleID: sale_obj.Sale_ID, saleDate: sale_obj.Sale_Date, itemName: sale_obj.Item_Name});
  });
});

app.post("/SalesRecordDeleted", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("DELETE FROM sales WHERE Sale_ID =  ('" + req.body.saleID + "');").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "salesRecordDeleted"), {saleID: req.body.saleID});
  }
  });
});

app.get("/DeleteItem", async function(req, res)
{
    var itemID = req.query.itemID;

    mysql.selectData("SELECT * FROM item WHERE Item_ID = '" + itemID + "'").then(itemResult =>
    {
      var item_obj;
      itemResult.forEach(function(element)
      {
        item_obj = element;
        //renders ejs doc as html, replace document variables with options for the select field
      });

      res.render(path.join(__dirname + static_path + "deleteItem"), {itemID: item_obj.Item_ID, itemIDValue: "value = '" + item_obj.Item_ID + "'",
      itemName: item_obj.Item_Name});
    });
});

app.post("/ItemDeleted", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("DELETE FROM item WHERE Item_ID =  ('" + req.post.itemID + "');").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "itemDeleted"), {itemID: req.post.itemID});
  }
  });
});

app.post("/DeleteItemType", async function(req, res)
{
    var itemTypeID = req.query.itemTypeID;

    mysql.selectData("SELECT * FROM item_types WHERE itmType_ID = '" + itemTypeID + "'").then(itemResult =>
    {
      var item_obj;
      itemResult.forEach(function(element)
      {
        item_obj = element;
        //renders ejs doc as html, replace document variables with options for the select field
      });

      res.render(path.join(__dirname + static_path + "deleteItemType"), {itemTypeID: item_obj.itemTypeID, itemTypeIDValue: "value = '" + item_obj.itemTypeID + "'",
      itemTypeName: item_obj.item_Type});
    });
});

app.post("/ItemTypeDeleted", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("DELETE FROM item_types WHERE itmType_ID =  ('" + req.body.itemID + "');").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "itemTypeDeleted"), {itemTypeID: req.body.itemID});
  }
  });
});

//Edit Item Page
app.get("/EditItem", async function(req, res)
{
  var itemID = req.query.itemID;
  //waits for the response for database, then continues, utilizing the response string
  await mysql.selectData("SELECT * FROM item_types ORDER BY item_types.item_Type").then(result =>
    {
      var options_string = "";

      result.forEach(function(element)
      {
        options_string += "<option value=" + element.itmType_ID + ">" + element.item_Type + "</option>";
      });

      mysql.selectData("SELECT * FROM item WHERE Item_ID = '" + itemID + "'").then(itemResult =>
      {
        var item_obj;
        itemResult.forEach(function(element)
        {
          item_obj = element;
          //renders ejs doc as html, replace document variables with options for the select field
        });

        res.render(path.join(__dirname + static_path + "editItem"), {options: HTMLParser.parse(options_string), itemID: "value = '" + item_obj.Item_ID + "'",
        itemName: "value = '" + item_obj.Item_Name + "'", itemPrice: "value = '" + item_obj.Price + "'"});
      });
    });
});

app.get("/DeleteItem", async function(req, res)
{
  var itemID = req.query.itemID;
  //waits for the response for database, then continues, utilizing the response string
  await mysql.selectData("SELECT * FROM item_types ORDER BY item_types.item_Type").then(result =>
    {
      var options_string = "";

      result.forEach(function(element)
      {
        options_string += "<option value=" + element.itmType_ID + ">" + element.item_Type + "</option>";
      });

      mysql.selectData("SELECT * FROM item WHERE Item_ID = '" + itemID + "'").then(itemResult =>
      {
        var item_obj;
        itemResult.forEach(function(element)
        {
          item_obj = element;
          //renders ejs doc as html, replace document variables with options for the select field
        });

        res.render(path.join(__dirname + static_path + "deleteItem"), {options: HTMLParser.parse(options_string), itemID: "value = '" + item_obj.Item_ID + "'",
        itemName: "value = '" + item_obj.Item_Name + "'", itemPrice: "value = '" + item_obj.Price + "'"});
      });
    });
});

app.post("/ItemEdited", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("UPDATE item SET Item_Name = '" + req.body.itemName + "', Price = '" + req.body.itemPrice +
    "', itmType_ID = '" + req.body.itemType + "' WHERE Item_ID = '" + req.body.itemID + "'").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "ItemEdited"), {name: req.body.itemName});
  }
  });
});

app.get("/EditItemType", async function(req, res)
{
  var itemTypeID = req.query.itemTypeID;
  //waits for the response for database, then continues, utilizing the response string
  await mysql.selectData("SELECT * FROM item_types WHERE itmType_ID = '" + itemTypeID + "'").then(result =>
    {
        var itemType_obj;

        result.forEach(function(element)
        {
          itemType_obj = element;
        });

        res.render(path.join(__dirname + static_path + "editItemType"), {itemTypeID: "value = '" + itemTypeID + "'", itemTypeName: "value = '" + itemType_obj.item_Type + "'"});
      });
});

app.post("/ItemTypeEdited", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("UPDATE item_types SET item_Type = '" + req.body.typeName + "' WHERE itmType_ID = '" + req.body.itemTypeID  + "'").then(result => {
    if (result)
    {
      res.render(path.join(__dirname + static_path + "itemTypeAdded"), {name: req.body.typeName});
    }
  });
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

app.get("/EditSalesRecord", async function(req, res)
{
  var saleID = req.query.saleID;
 
  await mysql.selectData("SELECT * FROM sales ORDER BY sales.Sale_ID").then(result =>
    {
      var options_string = "";
 
      result.forEach(function(element)
      {
        options_string += "<option value=" + element.saleID + ">" + element.saleDate + "</option>";
      });
 
      mysql.selectData("SELECT * FROM sales WHERE Sale_ID = '" + saleID + "'").then(saleResult =>
      {
        var sale_obj;
        saleResult.forEach(function(element)
        {
          sale_obj = element;
          //renders ejs doc as html, replace document variables with options for the select field
        });
 
         res.render(path.join(__dirname + static_path + "editSales"), {options: HTMLParser.parse(options_string), saleID: "value = '" + sale_obj.salesID + "'",
         salesDate: "value = '" + sale_obj.salesDate + "'"});
       });
 
 
      res.render(path.join(__dirname + static_path + "editSales"));
 
    });
});

app.post("/SalesEdited", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("UPDATE sales SET Sale_ID = '" + req.body.saleID + "', Date = '" + req.body.salesDate +
    "', Quantity = '" + req.body.itemQuantity + "' WHERE Sale_ID = '" + req.body.saleID + "'").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "SalesEdited"), {name: req.body.saleID});
  }
  });
});

const server = http.createServer(app);
server.listen(process.env.PORT || '3001', function () {
  console.log('Server app listening on port 3001!');
});
