"use strict";

const http = require('http');
const fileSystem = require('fs');
const express = require('express');
const path = require('path');
const HTMLParser = require('node-html-parser');
var sanitizeHtml = require('sanitize-html');

//creates express app
const app = express();
app.use(express.json())
app.set('view engine', 'ejs');

const check = require('express-validator/check').check;
const validationResult = require('express-validator/check').validationResult;

//gets seperate js file for sql commands, etc
const mysql = require("./scripts/server/sql_script.js");
const forecast = require("./scripts/server/forecast_sales.js");

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
  var typeName = sanitizeHtml(req.body.typeName);
  await mysql.insertData("INSERT INTO item_types (item_Type) VALUES ('" + typeName + "');").then(result => {
    if (result)
    {
      res.render(path.join(__dirname + static_path + "itemTypeAdded"), {name: typeName});
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
  var itemName = sanitizeHtml(req.body.itemName);
  var itemPrice = sanitizeHtml(req.body.itemPrice);
  var itemType = sanitizeHtml(req.body.itemType);
  var stockQuantity = sanitizeHtml(req.body.stockQuantity);

  await mysql.insertData("INSERT INTO item (Item_Name, Price, itmType_ID, stockQuantity) VALUES ('" + itemName + "'," + itemPrice + "," + itemType + "," + stockQuantity + ");").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "itemAdded"), {name: itemName});
  }
  });
});

app.post("/ItemDeleted", async function(req, res)
{
  var itemName = sanitizeHtml(req.body.itemName);
  var itemID = sanitizeHtml(req.body.itemID);
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("DELETE FROM item WHERE Item_ID =  ('" + itemID + "');").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "itemDeleted"), {name: itemName, itemID: itemID});
  }
  });
});

app.get("/AddSalesRecord", async function(req, res)
{
  res.render(path.join(__dirname + static_path + "addSales"));
});

app.post("/SalesRecordAdded", async function(req, res)
{
  var item_quantity_arr = sanitizeHtml(req.body.item_info);
  var salesDate = sanitizeHtml(req.body.salesDate);

  //inserts master record
  await mysql.selectData("INSERT INTO sales (Sale_Date) VALUES ('" + salesDate + "'); SELECT LAST_INSERT_ID() as insertid;").then(result => {

      var return_obj;

      //then loops result object, selecting last entry
      result.forEach(function(element)
      {
        return_obj = element;
      });

      //the query has returned the last auto increment ID it assigned for the transaction, which is the ID for the sales entry
      var sales_id = return_obj[0].insertid;
      sales_id = sanitizeHtml(sales_id);
      var salesDate = sanitizeHtml(req.body.salesDate);

      //the item info is split into it's components
      //item info follow this structure: [item_id, quantity],[item_id, quantity],
      var item_info = sanitizeHtml(req.body.item_info);
      item_info.split("]").forEach(function(element)
      {
        if (element.trim().length > 0)
        {
          var string = element.trim();
          //this string has the item_id and capacity, seperated by a comma
          string = sanitizeHtml(string);
          string = string.split("[")[1];

          //inserts new record into sales_items
          mysql.insertData("INSERT INTO sales_items (Sale_ID, Item_ID, Quantity) VALUES ('" + sales_id + "' ,'" + string.split(",")[0] + "', '" + string.split(",")[1] + "')");
        }
      });

      //page is renders with
      res.render(path.join(__dirname + static_path + "salesRecordAdded"), {date: salesDate});
  });
});

app.get("/SearchSalesRecord", async function(req, res)
{
  res.render(path.join(__dirname + static_path + "searchSalesRecord"));
});

app.post("/ReturnSalesRecords", async function(req, res)
{
  var search_string = sanitizeHtml(req.body.searchString);
  var search_date = sanitizeHtml(req.body.searchDate);
  var start_date = sanitizeHtml(req.body.startDate);
  var end_date = sanitizeHtml(req.body.endDate);

  var output_string = "";

  if (search_date == "true")
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON item.Item_ID = sales_items.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE item.Item_Name LIKE '%" + search_string +
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
    await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON item.Item_ID = sales_items.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE item.Item_Name LIKE '%" + search_string +
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
  var start_date = sanitizeHtml(req.query.startDate);
  var end_date = sanitizeHtml(req.query.endDate);

  var output_string = "";

  start_date = start_date + "-00";

  if (end_date.length > 0)
  {
    end_date = end_date + "-00";
  }

  var output_string = "";

  if (end_date.length > 0)
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON item.Item_ID = sales_items.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE sales.Sale_Date >= CONVERT('" +
      start_date + "', date) AND sales.Sale_Date <= CONVERT('" + end_date + "', date)").then(result => {

      result.forEach(function(element)
      {
        output_string += element.Sale_ID + "," + element.Quantity + "," + element.Item_ID + "," + element.Item_Name + "," +
          element.itmType_ID + "," + element.item_Type + ","+ element.Sale_Date + '\n';
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
    var month = start_date.split("-")[1];
    var year = start_date.split("-")[0];
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

    await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON item.Item_ID = sales_items.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE sales.Sale_Date >= CONVERT('" +
      start_date + "', date) AND sales.Sale_Date <= CONVERT('" + final_start_date + "', date)").then(result => {

      result.forEach(function(element)
      {
        output_string += element.Sale_ID + "," + element.Quantity + "," + element.Item_ID + "," + element.Item_Name + "," +
          element.itmType_ID + "," + element.item_Type + ","+ element.Sale_Date + '\n';});

      if (output_string.length == 0)
      {
        output_string = "<p>No Results Found</p>";
      }

    });
  }

  output_string = "Sales ID, Quantity, Item ID, Item Name, Item Type ID, Item Type Name, Sale Date" + '\n' + output_string;
  if (end_date.length > 0)
  {
    res.setHeader('Content-disposition', 'attachment; filename=sales_report' + start_date + '-' + end_date + '.csv');
  }
  else
  {
    res.setHeader('Content-disposition', 'attachment; filename=sales_report' + start_date + '.csv');
  }
  res.set('Content-Type', 'text/csv');
  res.status(200).send(output_string);
})


app.get("/GenerateSalesReport", function(req, res)
{
  res.render(path.join(__dirname + static_path + "generateSalesReport"));
});

app.get("/DisplaySalesReport", async function(req, res)
{
  var start_date = sanitizeHtml(req.query.startDate);
  var end_date = sanitizeHtml(req.query.endDate);

  start_date = start_date + "-00";

  if (end_date.length > 0)
  {
    end_date = end_date + "-00";
  }

  var output_string = "";

  if (end_date.length > 0)
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON item.Item_ID = sales_items.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE sales.Sale_Date >= CONVERT('" +
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
    var month = start_date.split("-")[1];
    var year = start_date.split("-")[0];
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

    await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON item.Item_ID = sales_items.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE sales.Sale_Date >= CONVERT('" +
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
  var saleID = sanitizeHtml(req.query.saleID);

  mysql.selectData("SELECT * FROM sales WHERE Sale_ID = '" + saleID +
  "'").then(itemResult =>
  {
    var sale_obj;
    itemResult.forEach(function(element)
    {
      sale_obj = element;
      //renders ejs doc as html, replace document variables with options for the select field
    });

    res.render(path.join(__dirname + static_path + "deleteSales"), {saleIDValue: "value = '" + sale_obj.Sale_ID + "'", saleID: sale_obj.Sale_ID, saleDate: sale_obj.Sale_Date});
  });
});

app.post("/SalesRecordDeleted", async function(req, res)
{
  var saleID = sanitizeHtml(req.body.saleID);
  //waits for the response for database, then continues, utilizing the response string
  //deletes linked items
  await mysql.insertData("DELETE FROM sales_items WHERE Sale_ID =  ('" + saleID + "');").then(result => {
  if (result)
  {
    //deletes master sales record itself
    mysql.insertData("DELETE FROM sales WHERE Sale_ID =  ('" + saleID + "');").then(result => {
      res.render(path.join(__dirname + static_path + "salesRecordDeleted"), {saleID: saleID});
    });
  }
  });
});

app.get("/DeleteItem", async function(req, res)
{
    var itemID = sanitizeHtml(req.query.itemID);

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
  var itemID = sanitizeHtml(req.post.itemID);
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("DELETE s_i, s FROM sales_items as s_i JOIN sales as s ON s_i.Sale_ID = s.Sale_ID WHERE s_i.Item_ID = '" + itemID + "';").then(result => {
    if (result)
    {
      mysql.selectData("DELETE FROM item WHERE Item_ID =  ('" + itemID + "');").then(itemResult =>
      {
        res.render(path.join(__dirname + static_path + "itemDeleted"), {itemID: itemID});
      });
    }
  });
});

app.get("/DeleteItemType", async function(req, res)
{
    var itemTypeID = sanitizeHtml(req.query.itemTypeID);

    mysql.selectData("SELECT * FROM item_types WHERE itmType_ID = '" + itemTypeID + "'").then(itemResult =>
    {
      var item_obj;
      itemResult.forEach(function(element)
      {
        item_obj = element;
        //renders ejs doc as html, replace document variables with options for the select field
      });

      res.render(path.join(__dirname + static_path + "deleteItemType"), {itemTypeID: item_obj.itmType_ID, itemTypeIDValue: "value = '" + item_obj.itmType_ID + "'",
      itemTypeName: item_obj.item_Type});
    });
});

app.post("/ItemTypeDeleted", async function(req, res)
{
  var itemTypeID = sanitizeHtml(req.body.itemTypeID);
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("DELETE s_i, s FROM sales_items as s_i JOIN sales as s ON s_i.Sale_ID = s.Sale_ID JOIN item i ON s_i.Item_ID = i.Item_ID WHERE i.itmType_ID = '" + itemTypeID + "';").then(result => {
    if (result)
    {
      mysql.selectData("DELETE FROM item WHERE itmType_ID =  ('" + itemTypeID + "');").then(itemResult =>
      {
        mysql.selectData("DELETE FROM item_types WHERE itmType_ID =  ('" + itemTypeID + "');").then(itemResult =>
        {
          res.render(path.join(__dirname + static_path + "itemTypeDeleted"), {itemTypeID: itemTypeID});
        });
      });
    }
  });
});

//Edit Item Page
app.get("/EditItem", async function(req, res)
{
  var itemID = sanitizeHtml(req.query.itemID);
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
        itemName: "value = '" + item_obj.Item_Name + "'", itemPrice: "value = '" + item_obj.Price + "'", itemStock: "value = '" + item_obj.stockQuantity + "'"});
      });
    });
});

app.get("/DeleteItem", async function(req, res)
{
  var itemID = sanitizeHtml(req.query.itemID);
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
  var itemName = sanitizeHtml(req.body.itemName);
  var itemPrice = sanitizeHtml(req.body.itemPrice);
  var itemID = sanitizeHtml(req.body.itemID);
  var itemType = sanitizeHtml(req.body.itemType);
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("UPDATE item SET Item_Name = '" + itemName + "', Price = '" + itemPrice +
    "', itmType_ID = '" + itemType + "' WHERE Item_ID = '" + itemID + "'").then(result => {
  if (result)
  {
    res.render(path.join(__dirname + static_path + "ItemEdited"), {name: itemName});
  }
  });
});

app.get("/EditItemType", async function(req, res)
{
  var itemTypeID = sanitizeHtml(req.query.itemTypeID);
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
  var typeName = sanitizeHtml(req.body.typeName);
  var itemTypeID = sanitizeHtml(req.body.itemTypeID);

  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("UPDATE item_types SET item_Type = '" + typeName + "' WHERE itmType_ID = '" + itemTypeID  + "'").then(result => {
    if (result)
    {
      res.render(path.join(__dirname + static_path + "itemTypeAdded"), {name: typeName});
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
  await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON item.Item_ID = sales_items.Item_ID").then(result => {

    // Render view and pass result of query to be displayed
    res.render(path.join(__dirname + static_path + "ViewSaleRecords"), {SalesData: result});
  });
});

// -----------------------------------------------------------------------------------------
app.get("/getItems", async function(req, res)
{
  var searchString = sanitizeHtml(req.query.searchString);
  await mysql.selectData("SELECT * FROM item JOIN item_types ON item.itmType_ID = item_types.itmType_ID WHERE item.Item_Name LIKE '%" + searchString + "%'").then(result => {
    res.send(result);
  });
});

app.get("/getItemByID", async function(req, res)
{
  var itemID = sanitizeHtml(req.query.itemID);
  await mysql.selectData('SELECT * FROM item JOIN item_types ON item.itmType_ID = item_types.itmType_ID WHERE item.Item_ID = "' + itemID + '"').then(result => {
    res.send(result);
  });
});

app.get("/EditSalesRecord", async function(req, res)
{
  //sale ID is stored in get variable is url, which is returned here
  var saleID = sanitizeHtml(req.query.saleID);

  await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID WHERE sales.Sale_ID = '" + saleID + "'").then(saleResult =>
      {
        var sale_items = "";
        var sale_obj;

        //loops through all of the returned record and constructs returns string from elements
        saleResult.forEach(function(element)
        {
          sale_obj = element;
          sale_items += "[" + element.Item_ID + "," + element.Quantity + "],"
          //renders ejs doc as html, replace document variables with options for the select field
        });

        //constructs date string for sql date object
        //https://stackoverflow.com/questions/3066586/get-string-in-yyyymmdd-format-from-js-date-object?page=2&tab=votes#tab-top
        var b = sale_obj.Sale_Date.getFullYear();
        var c = sale_obj.Sale_Date.getMonth();
        (++c < 10)? c = "0" + c : c;
        var d = sale_obj.Sale_Date.getDate();
        (d < 10)? d = "0" + d : d;
        var final = b + "-" + c + "-" + d;

        //render page
         res.render(path.join(__dirname + static_path + "editSales"), {saleID: "value = '" + sale_obj.Sale_ID + "'",
         saleDate: "value = '" + final + "'", sale_items: sale_items});
       });
});

app.post("/SalesEdited", async function(req, res)
{
  //old items, currently in database
  var old_item_id_array = [];

  //new items, returns for the form submission
  var item_id_array = [];

  var item_info = sanitizeHtml(req.body.item_info);

  //the item info is split into it's components
  //item info follow this structure: [item_id, quantity],[item_id, quantity],
  item_info.split("]").forEach(function(element)
  {
    if (element.trim().length > 0)
    {
      var string = element.trim();
      //this string has the item_id and capacity, seperated by a comma
      string = string.split("[")[1];
      //pushs split string into a multidimesional array
      item_id_array.push([parseInt(string.split(",")[0]), parseInt(string.split(",")[1])]);
    }
  });

  var saleID = sanitizeHtml(req.body.saleID);
  var saleDate = sanitizeHtml(req.body.salesDate);

  //selects all of the sales items associated with the sale record currently in the database
  await mysql.selectData("SELECT * FROM sales_items WHERE Sale_ID = '" + saleID + "'").then(result =>
  {

    //loops through all of the elements in sql result object
    result.forEach(function(element)
    {
      //adds ID of old element to array
      old_item_id_array.push(parseInt(element.Item_ID));
      //filters entry, producing an array
      //return array, indicates array returned from form, includes a currrent sales item
      var filter_entries = item_id_array.filter(i => parseInt(i[0]) == parseInt(element.Item_ID));

      //if it doesn't contain the item, it is deleted
      if (filter_entries.length == 0)
      {
        mysql.insertData("DELETE FROM sales_items WHERE Sale_ID = '" + saleID + "' AND Item_ID = '" + element.Item_ID + "'");
      }
      else
      {
        //if it does contain the item, it is updated with returned form details
        mysql.insertData("UPDATE sales_items SET Quantity = '" + filter_entries[0][1] + "' WHERE Sale_ID = '" + saleID + "' AND Item_ID = '" + element.Item_ID + "'")
      }
      //if not present in item_id_array insert here!
    })

    //loops through list of item return from form
    item_id_array.forEach(function(element)
    {
      //if there is an item that exists in the new array that doesn't exist in the old item_id_array
      //then this is added to the database
      if (!old_item_id_array.includes(parseInt(element[0])))
      {
        //remove element!
        mysql.insertData("INSERT INTO sales_items (Sale_ID, Item_ID, Quantity) VALUES ('" + saleID + "', '" + element[0] + "', '" + element[1] + "')");
      }
    });

    //master sales record is then updated
    mysql.selectData("UPDATE sales SET Sale_Date = '" + saleDate + "' WHERE Sale_ID = '" + saleID + "'").then(result =>
    {
      //page is then rendered
      res.render(path.join(__dirname + static_path + "SalesEdited"), {saleID: saleID});
    });
  });
});

app.get("/ForecastSales", async function(req, res)
{
  var item_id = sanitizeHtml(req.query.itemID);
  var data = [];
  var table_string = "";

    await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID WHERE sales_items.Item_ID = '" +
      item_id + "' ORDER BY sales.Sale_Date ASC").then(result => {
      var entry;

      result.forEach(function(element)
      {
        entry = element;
        data.push([element.Sale_Date, element.Quantity]);
        table_string += "<tr><td>" + element.Sale_Date +"</td><td>" + element.Quantity + "</td></tr>";
      });

      res.render(path.join(__dirname + static_path + "forecastForItem"), {item_id: item_id, graph: forecast.getGraphURL(data, 2), name: entry.Item_Name, price: entry.Price, data: HTMLParser.parse(table_string), forecast: forecast.predictSales(data, 2)});

  });
});

app.get("/ForecastItemType", async function(req, res)
{
  var item_type_id = sanitizeHtml(req.query.itemType);

  var data = [];
  var table_string = "";

    await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID JOIN item_types ON item.itmType_ID = item_types.itmType_ID WHERE item.itmType_ID = '" +
      item_type_id + "' ORDER BY sales.Sale_Date ASC").then(result => {
      var entry;

      result.forEach(function(element)
      {
        entry = element;
        data.push([element.Sale_Date, element.Quantity]);
        table_string += "<tr><td>" + element.Item_Name + "</td><td>" + element.Sale_Date +"</td><td>" + element.Quantity + "</td></tr>";
      });

      res.render(path.join(__dirname + static_path + "forecastForItemType"), {item_type_id: item_type_id, graph: forecast.getGraphURL(data, 2), name: entry.Item_Name, price: entry.Price, data: HTMLParser.parse(table_string), forecast: forecast.predictSales(data, 2)});

  });
});

// View Items page
app.get("/SalesItemsPredictions", async function(req, res)
{
  // Querey database and wait for result response
  // Returns ALL sales records and passes in array
  await mysql.selectData("SELECT * FROM item JOIN item_types ON item.itmType_ID = item_types.itmType_ID").then(result => {

    // Render view and pass result of query to be displayed
    res.render(path.join(__dirname + static_path + "salesItemsPredictions"), {ItemData: result});
  });
});

app.get("/SalesItemTypePredictions", async function(req, res)
{
  // Querey database and wait for result response
  // Returns ALL sales records and passes in array
  await mysql.selectData("SELECT * FROM item_types").then(result => {

    // Render view and pass result of query to be displayed
    res.render(path.join(__dirname + static_path + "salesItemTypesPredictions"), {ItemData: result});
  });
});

const server = http.createServer(app);
server.listen(process.env.PORT || '3001', function () {
  console.log('Server app listening on port 3001!');
});
