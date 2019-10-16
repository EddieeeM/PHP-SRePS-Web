"use strict";

const http = require('http');
const fileSystem = require('fs');
const express = require('express');
const session = require('express-session');
const path = require('path');
const HTMLParser = require('node-html-parser');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;

//creates express app
const app = express();

app.set('view engine', 'ejs');

//gets seperate js file for sql commands, etc
const mysql = require("./scripts/Create_Script.js");
const forecast = require("./scripts/forecast_sales.js");

//needed for getting form data
const bodyParser = require('body-parser')
const middlewares = [bodyParser.urlencoded()]

//Express Session Packages
app.use(session({
  secret: "secret",
  resave: true,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

//where all of the static 'html' or 'ejs' data is stored
const static_path = "/public/html/";

app.use(express.static(__dirname + '/public'));
app.use(passport.initialize());
app.use(passport.session());

//creates the DB
mysql.createDB();

//creates Tables
mysql.createTables();

// passport.use(new localStrategy(function (username, password, done) {
//   var username = req.body.Username;
//   var password = req.body.Password;

//   console.log(username);
//   console.log(password);
  
//   mysql.selectData("SELECT Password FROM user_logins WHERE Username = ?", [username], function(err, results, fields) 
//   {
//     if(err) { done(err) };
//     if(results.length == 0){
//       done(null, false);
//     }

//     const hash = results[0].password.toString();

//     bcrypt.compare(password, hash, function(err, response) {
//       if (response == true) {
//         return done(null, {user_id: results[0].id});
//       } else {
//         return done(null, false);
//       }
//     })

//     return done(null,'Successful Login!');
//   })
// }));

// passport.serializeUser(function(user, done){
//     done(null, mysql.selectData("SELECT * FROM user_Logins WHERE User_ID = '" + userid + "'"));
//   });

// passport.deserializeUser(async function(id, done){
//   await mysql.selectData("SELECT * FROM user_logins WHERE User_ID = '" + User_ID +"'").then(result => {
//     // function(err, rows) {
//     //   done(err, rows[0]);
//     // };
//   });
// })

//essentially index for page
app.get("/", function(req, res)
{
  if (req.session.loggedin){
    res.render(path.join(__dirname + static_path + "/"));
  } else {
    res.render(path.join(__dirname + static_path + "Login"));
  }
  res.end();
});

//User Registration
app.get("/Register", function(req, res){
  res.render(path.join(__dirname + static_path + "Register"));
});

//Registration Script
app.post("/RegisteredResult", async function(req, res){

  await mysql.selectData("INSERT INTO users (FirstName, LastName, Email) VALUES ('" + req.body.FirstName + "', '" + req.body.LastName + "', '" + req.body.Email + "'); SELECT LAST_INSERT_ID() as insertid;").then(result => {
    var userid = result[0].insertId;
    if (result)
    {
      mysql.insertData("INSERT INTO user_logins (User_ID, UserName, Password) VALUES('" + userid + "', '" + req.body.Username + "', '" + req.body.Password + "');").then(result =>
      {
        res.render(path.join(__dirname + static_path + "RegisteredResult"), {Username: req.body.Username, FirstName: req.body.FirstName});
      });
    }
    else {
      res.send('Please fill in all the fields!');
      res.redirect('/Register');
      res.end();
    }
  });
});

//User Login
app.get("/Login", function(req, res){

  res.render(path.join(__dirname + static_path + "Login"));

});

//Login Script
app.post("/LoggingIn", async function(req, res){
  var username = req.body.Username;
  var password = req.body.Password;

  //Checks if username and password is entered before running script
  if (username && password)
  {
    await mysql.selectData("SELECT * FROM user_logins WHERE Username = '" + username + "' AND Password = '" + password + "'", [username, password]).then(result => {
      if (result.length > 0) 
      {
        // const hash = result[0].password.toString();

        // bcrypt.compare(password, hash, function(err, response) {
        //   if (response == true) {
        //     return done(null, {user_id: results[0].id});
        //   } else {
        //     return done(null, false);
        //   }
        // })

        req.session.loggedin = true;
        req.session.username = username;
        req.session.password = password;

        res.redirect("/");
      } 
      else
      {
        req.session.loggedin = false;
        res.redirect("/Login");
      }
      res.end();
      })
  } else {
    res.send("Please Enter Username and Password!");
    res.end();
  }
});

app.get("/AddItemType", function(req, res)
{
  if (req.session.loggedin){
    res.render(path.join(__dirname + static_path + "addItemType"));
    
  } else {
    res.redirect("/Login");
  }

});

app.post("/ItemTypeAdded", async function(req, res)
{
  if (req.session.loggedin)
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.insertData("INSERT INTO item_types (item_Type) VALUES ('" + req.body.typeName + "');").then(result => {
      if (result)
      {
        res.render(path.join(__dirname + static_path + "itemTypeAdded"), {name: req.body.typeName});
      }
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/AddItem", async function(req, res)
{
  if (req.session.loggedin)
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
  } else {
    res.redirect("/Login");
  }
});

app.post("/ItemAdded", async function(req, res)
{
  if (req.session.loggedin)
  { 
    //waits for the response for database, then continues, utilizing the response string
    await mysql.insertData("INSERT INTO item (Item_Name, Price, itmType_ID) VALUES ('" + req.body.itemName + "'," + req.body.itemPrice + "," + req.body.itemType + ");").then(result => {
    if (result)
      {
        res.render(path.join(__dirname + static_path + "itemAdded"), {name: req.body.itemName});
      }
    });
  } else {
    res.redirect("/Login");
  }
});

app.post("/ItemDeleted", async function(req, res)
{
  if(req.session.loggedin)
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.insertData("DELETE FROM item WHERE Item_ID =  ('" + req.body.itemID + "');").then(result => {
    if (result)
      {
        res.render(path.join(__dirname + static_path + "itemDeleted"), {name: req.body.itemName,itemID: req.body.itemID});
      }
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/AddSalesRecord", async function(req, res)
{
  if (req.session.loggedin)
  {
    res.render(path.join(__dirname + static_path + "addSales"));
  } else {
    res.redirect("/Login");
  };
});

app.post("/SalesRecordAdded", async function(req, res)
{
  var item_quantity_arr = req.body.item_info;

  if(req.session.loggedin)
  {
    //inserts master record
    await mysql.selectData("INSERT INTO sales (Sale_Date) VALUES ('" + req.body.salesDate + "'); SELECT LAST_INSERT_ID() as insertid;").then(result => {

        var return_obj;

        //then loops result object, selecting last entry
        result.forEach(function(element)
        {
          return_obj = element;
        });

        //the query has returned the last auto increment ID it assigned for the transaction, which is the ID for the sales entry
        var sales_id = return_obj[0].insertid;

        //the item info is split into it's components
        //item info follow this structure: [item_id, quantity],[item_id, quantity],
        req.body.item_info.split("]").forEach(function(element)
        {
          if (element.trim().length > 0)
          {
            var string = element.trim();
            //this string has the item_id and capacity, seperated by a comma
            string = string.split("[")[1];
            //inserts new record into sales_items
            mysql.insertData("INSERT INTO sales_items (Sale_ID, Item_ID, Quantity) VALUES ('" + sales_id + "' ,'" + string.split(",")[0] + "', '" + string.split(",")[1] + "')");
          }
        });

        //page is renders with
        res.render(path.join(__dirname + static_path + "salesRecordAdded"), {date: req.body.salesDate});
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/SearchSalesRecord", async function(req, res)
{
  if (req.session.loggedin)
  {
    res.render(path.join(__dirname + static_path + "searchSalesRecord"));
  } else {
    res.redirect("/Login");
  }
});

app.post("/ReturnSalesRecords", async function(req, res)
{
  var search_string = req.body.searchString;
  var search_date = req.body.searchDate;
  var start_date = req.body.startDate;
  var end_date = req.body.endDate;

  var output_string = "";

  if (req.session.loggedin)
  {
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
  } else {
    res.redirect("/Login");
  }
});


app.get("/DownloadCSV", async function(req, res)
{
  if (req.session.loggedin)
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

      await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON item.Item_ID = sales_items.Item_ID JOIN item_types ON item_types.itmType_ID = item.itmType_ID WHERE sales.Sale_Date >= CONVERT('" +
        start_date + "', date) AND sales.Sale_Date <= CONVERT('" + final_start_date + "', date)").then(result => {

        result.forEach(function(element)
        {
          output_string += element.Sale_ID + "," + element.Quantity + "," + element.Item_ID + "," + element.Item_Name + "," +
            element.itmType_ID + "," + element.item_Type + ","+ element.Sale_Date + '\n';      });

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
  } else {
    res.redirect("/Login");
  }
})


app.get("/GenerateSalesReport", function(req, res)
{
  if(req.session.loggedin)
  {
    res.render(path.join(__dirname + static_path + "generateSalesReport"));
  } else {
    res.redirect("/Login");
  }
});

app.get("/DisplaySalesReport", async function(req, res)
{
  if (req.session.loggedin)
  {
    var start_date = req.query.startDate;
    var end_date = req.query.endDate;

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
  } else {
    res.redirect("/Login");
  }
});

app.get("/ManageItems", function(req, res)
{
  if (req.session.loggedin)
  {
    res.render(path.join(__dirname + static_path + "manageItems"));
  } else {
    res.redirect("/Login");
  }
});

app.get("/ManageItemTypes", function(req, res)
{
  if (req.session.loggedin)
  {
    res.render(path.join(__dirname + static_path + "manageItemTypes"));
  } else {
    res.redirect("/Login");
  }
});

// View Items page
app.get("/ViewItemRecords", async function(req, res)
{
  if(req.session.loggedin)
  {
    // Query database and wait for result response
    // Returns ALL sales records and passes in array
    await mysql.selectData("SELECT * FROM item JOIN item_types ON item.itmType_ID = item_types.itmType_ID").then(result => {

      // Render view and pass result of query to be displayed
      res.render(path.join(__dirname + static_path + "ViewItemRecords"), {ItemData: result});
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/ViewItemTypeRecords", async function(req, res)
{
  if(req.session.loggedin)
  {
    // Query database and wait for result response
    // Returns ALL sales records and passes in array
    await mysql.selectData("SELECT * FROM item_types").then(result => {

      // Render view and pass result of query to be displayed
      res.render(path.join(__dirname + static_path + "ViewItemTypeRecords"), {ItemData: result});
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/Contact", function(req, res)
{
  res.render(path.join(__dirname + static_path + "contact"));
});

app.get("/DeleteSalesRecord", async function(req, res)
{
  if(req.session.loggedin)
  {
    var saleID = req.query.saleID;

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
  } else {
    res.redirect("/Login");
  }
});

app.post("/SalesRecordDeleted", async function(req, res)
{

  if(req.session.loggedin)
  {
    //waits for the response for database, then continues, utilizing the response string
    //deletes linked items
    await mysql.insertData("DELETE FROM sales_items WHERE Sale_ID =  ('" + req.body.saleID + "');").then(result => {
      if (result)
      {
        //deletes master sales record itself
        mysql.insertData("DELETE FROM sales WHERE Sale_ID =  ('" + req.body.saleID + "');").then(result => {
          res.render(path.join(__dirname + static_path + "salesRecordDeleted"), {saleID: req.body.saleID});
        });
      }
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/DeleteItem", async function(req, res)
{
  if(req.session.loggedin)
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
  } else {
    res.redirect("/Login");
  }
});

app.post("/ItemDeleted", async function(req, res)
{
  if(req.session.loggedin) 
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.insertData("DELETE s_i, s FROM sales_items as s_i JOIN sales as s ON s_i.Sale_ID = s.Sale_ID WHERE s_i.Item_ID = '" + req.post.itemID + "';").then(result => {
      if (result)
      {
        mysql.selectData("DELETE FROM item WHERE Item_ID =  ('" + req.post.itemID + "');").then(itemResult =>
        {
          res.render(path.join(__dirname + static_path + "itemDeleted"), {itemID: req.post.itemID});
        });
      }
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/DeleteItemType", async function(req, res)
{
  if(req.session.loggedin)
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

        res.render(path.join(__dirname + static_path + "deleteItemType"), {itemTypeID: item_obj.itmType_ID, itemTypeIDValue: "value = '" + item_obj.itmType_ID + "'",
        itemTypeName: item_obj.item_Type});
      });
  } else {
    res.redirect("/Login");
  }
});

app.post("/ItemTypeDeleted", async function(req, res)
{
  if(req.session.loggedin)
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.insertData("DELETE s_i, s FROM sales_items as s_i JOIN sales as s ON s_i.Sale_ID = s.Sale_ID JOIN item i ON s_i.Item_ID = i.Item_ID WHERE i.itmType_ID = '" + req.body.itemTypeID + "';").then(result => {
      if (result)
      {
        mysql.selectData("DELETE FROM item WHERE itmType_ID =  ('" + req.body.itemTypeID + "');").then(itemResult =>
        {
          mysql.selectData("DELETE FROM item_types WHERE itmType_ID =  ('" + req.body.itemTypeID + "');").then(itemResult =>
          {
            res.render(path.join(__dirname + static_path + "itemTypeDeleted"), {itemTypeID: req.body.itemTypeID});
          });
        });
      }
    });
  } else {
    res.redirect("/Login");
  }
});

//Edit Item Page
app.get("/EditItem", async function(req, res)
{
  if(req.session.loggedin)
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
  } else {
    res.redirect("/Login");
  }
});

app.get("/DeleteItem", async function(req, res)
{
  if(req.session.loggedin)
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
  } else {
    res.redirect("/Login");
  }
});

app.post("/ItemEdited", async function(req, res)
{
  if(req.session.loggedin)
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.insertData("UPDATE item SET Item_Name = '" + req.body.itemName + "', Price = '" + req.body.itemPrice +
      "', itmType_ID = '" + req.body.itemType + "' WHERE Item_ID = '" + req.body.itemID + "'").then(result => {
    if (result)
    {
      res.render(path.join(__dirname + static_path + "ItemEdited"), {name: req.body.itemName});
    }
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/EditItemType", async function(req, res)
{
  if(req.session.loggedin)
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
  } else {
    res.redirect("/Login");
  }
});

app.post("/ItemTypeEdited", async function(req, res)
{
  if(req.session.loggedin) 
  {
    //waits for the response for database, then continues, utilizing the response string
    await mysql.insertData("UPDATE item_types SET item_Type = '" + req.body.typeName + "' WHERE itmType_ID = '" + req.body.itemTypeID  + "'").then(result => {
      if (result)
      {
        res.render(path.join(__dirname + static_path + "itemTypeAdded"), {name: req.body.typeName});
      }
    });
  } else {
    res.redirect("/Login");
  }
});
// -----------------------------------------------------------------------------------------
// -- Added by Alexander
// -----------------------------------------------------------------------------------------

// Manage Sales landing page
app.get("/ManageSales", function(req, res)
{
  if(req.session.loggedin)
  {
    res.render(path.join(__dirname + static_path + "manageSales"));
  } else {
    res.redirect("/Login");
  }
});

// View Records page
app.get("/ViewSaleRecords", async function(req, res)
{
  if(req.session.loggedin)
  {
    // Query database and wait for result response
    // Returns ALL sales records and passes in array
    await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON item.Item_ID = sales_items.Item_ID").then(result => {

      // Render view and pass result of query to be displayed
      res.render(path.join(__dirname + static_path + "ViewSaleRecords"), {SalesData: result});
    });
  } else {
    res.redirect("/Login");
  }
});

// -----------------------------------------------------------------------------------------
app.get("/getItems", async function(req, res)
{
  if(req.session.loggedin)
  {
    await mysql.selectData("SELECT * FROM item JOIN item_types ON item.itmType_ID = item_types.itmType_ID WHERE item.Item_Name LIKE '%" + req.query.searchString + "%'").then(result => {
      res.send(result);
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/getItemByID", async function(req, res)
{
  if(req.session.loggedin)
  {
    await mysql.selectData('SELECT * FROM item JOIN item_types ON item.itmType_ID = item_types.itmType_ID WHERE item.Item_ID = "' + req.query.itemID + '"').then(result => {
      res.send(result);
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/EditSalesRecord", async function(req, res)
{
  if (req.session.loggedin)
  {
    //sale ID is stored in get variable is url, which is returned here
    var saleID = req.query.saleID;

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
  } else {
    res.redirect("/Login");
  }
});

app.post("/SalesEdited", async function(req, res)
{
  if (req.session.loggedin)
  {
    //old items, currently in database
    var old_item_id_array = [];

    //new items, returns for the form submission
    var item_id_array = [];

    //the item info is split into it's components
    //item info follow this structure: [item_id, quantity],[item_id, quantity],
    req.body.item_info.split("]").forEach(function(element)
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

    //selects all of the sales items associated with the sale record currently in the database
    await mysql.selectData("SELECT * FROM sales_items WHERE Sale_ID = '" + req.body.saleID + "'").then(result =>
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
          mysql.insertData("DELETE FROM sales_items WHERE Sale_ID = '" + req.body.saleID + "' AND Item_ID = '" + element.Item_ID + "'");
        }
        else
        {
          //if it does contain the item, it is updated with returned form details
          mysql.insertData("UPDATE sales_items SET Quantity = '" + filter_entries[0][1] + "' WHERE Sale_ID = '" + req.body.saleID + "' AND Item_ID = '" + element.Item_ID + "'")
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
          mysql.insertData("INSERT INTO sales_items (Sale_ID, Item_ID, Quantity) VALUES ('" + req.body.saleID + "', '" + element[0] + "', '" + element[1] + "')");
        }
      });

      //master sales record is then updated
      mysql.selectData("UPDATE sales SET Sale_Date = '" + req.body.salesDate + "' WHERE Sale_ID = '" + req.body.saleID + "'").then(result =>
        {
        //page is then rendered
        res.render(path.join(__dirname + static_path + "SalesEdited"), {saleID: req.body.saleID});
        });
      });
    } else {
      res.redirect("/Login");
    }
  });

  app.get("/ForecastSales", async function(req, res)
  {
    if(req.session.loggedin)
    {
      var item_id = req.query.itemID;
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
    } else {
      res.redirect("/Login");
    }
});

app.get("/ForecastItemType", async function(req, res)
{
  if(req.session.loggedin)
  {
    var item_type_id = req.query.itemType;
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
  } else {
    res.redirect("/Login");
  }
  
});

// View Items page
app.get("/SalesItemsPredictions", async function(req, res)
{
  if(req.session.loggedin)
  {
    // Query database and wait for result response
    // Returns ALL sales records and passes in array
    await mysql.selectData("SELECT * FROM item JOIN item_types ON item.itmType_ID = item_types.itmType_ID").then(result => {

      // Render view and pass result of query to be displayed
      res.render(path.join(__dirname + static_path + "salesItemsPredictions"), {ItemData: result});
    });
  } else {
    res.redirect("/Login");
  }
});

app.get("/SalesItemTypePredictions", async function(req, res)
{
  if(req.session.loggedin)
  {
    // Query database and wait for result response
    // Returns ALL sales records and passes in array
    await mysql.selectData("SELECT * FROM item_types").then(result => {

      // Render view and pass result of query to be displayed
      res.render(path.join(__dirname + static_path + "salesItemTypesPredictions"), {ItemData: result});
    });
  } else {
    res.redirect("/Login");
  }
});

const server = http.createServer(app);
server.listen(process.env.PORT || '3001', function () {
  console.log('Server app listening on port 3001!');
});
