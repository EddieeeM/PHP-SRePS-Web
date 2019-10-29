"use strict";

const http = require('http');
const fileSystem = require('fs');
const express = require('express');
const session = require('express-session');
const path = require('path');
const HTMLParser = require('node-html-parser');
const bcrypt = require('bcryptjs');
const passport = require('passport');
var sanitizeHtml = require('sanitize-html');
const localStrategy = require('passport-local').Strategy;

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
app.get("/Register", function(req, res)
{
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
    else
    {
      res.send('Please fill in all the fields!');
      res.redirect('/Register');
      res.end();
    }
  });
});

app.get("/DeleteUserRecord", async function(req, res)
{
  var userID = req.query.userID;

  mysql.selectData("SELECT * FROM users WHERE User_ID = '" + userID +
  "'").then(userResult =>
  {
    var user_obj;
    userResult.forEach(function(element)
    {
      user_obj = element;
      //renders ejs doc as html, replace document variables with options for the select field
    });

    res.render(path.join(__dirname + static_path + "deleteUser"), {userID: user_obj.User_ID, userName: user_obj.FirstName, userIDValue: user_obj.User_ID});
  });
});

app.post("/UserRecordDeleted", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  //deletes linked items

  await mysql.insertData("DELETE FROM user_logins WHERE User_ID =  ('" + req.body.userID + "');").then(result => {

    //deletes master sales record itself
    mysql.insertData("DELETE FROM users WHERE User_ID =  ('" + req.body.userID + "');").then(result => {
      res.render(path.join(__dirname + static_path + "userRecordDeleted"), {userID: req.body.userID});
    });
  });
});


app.get("/ViewUsers", async function(req, res)
{
  // Querey database and wait for result response
  // Returns ALL sales records and passes in array
  await mysql.selectData("SELECT * FROM users").then(result => {

    // Render view and pass result of query to be displayed
    res.render(path.join(__dirname + static_path + "viewUsers"), {UserData: result});
  });
});

app.get("/EditUserDetails", async function(req, res)
{
  var userID = req.query.userID;
  //waits for the response for database, then continues, utilizing the response string

    await mysql.selectData("SELECT * FROM users JOIN user_logins ON users.User_ID = user_logins.User_ID WHERE users.User_ID = '" + userID + "'").then(result =>
    {
        var user_obj;

        result.forEach(function(element)
        {
          user_obj = element;
        });

        res.render(path.join(__dirname + static_path + "editUserDetails"), {userID: userID, FirstName: user_obj.FirstName, LastName: user_obj.LastName, Email: user_obj.Email, UserName: user_obj.Username});
      });
});

app.post("/UserDetailsEdited", async function(req, res)
{
  //waits for the response for database, then continues, utilizing the response string
  await mysql.insertData("UPDATE users SET FirstName = '" + req.body.FirstName + "', LastName = '" + req.body.LastName +
    "', Email = '" + req.body.Email + "' WHERE User_ID = '" + req.body.userID + "'").then(result => {
  if (result)
  {
    mysql.insertData("UPDATE user_logins SET UserName = '" + req.body.UserName + "', Password = '" + req.body.Password + "' WHERE User_ID = '" + req.body.userID + "'").then(result => {
      if (result)
      {
        res.render(path.join(__dirname + static_path + "UserDetailsEdited"), {UserID: req.body.userID, FirstName: req.body.FirstName, LastName: req.body.LastName, Email: req.body.Email});
      }
    });
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
  }
  else
  {
    res.send("Please Enter Username and Password!");
    res.end();
  }
});

//LogOut Script

app.get("/Logout", function(req,res){

  if(req.session.loggedin)
  {
    req.session.destroy(function (err)
    {
      if(err)
      {
        next(err);
      } else {
        res.redirect("/Login");
      }
    })
  }
});

app.get("/AddItemType", function(req, res)
{
  if (req.session.loggedin)
  {
    res.render(path.join(__dirname + static_path + "addItemType"));
  }
  else
  {
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
  }
  else
  {
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
  }
  else
  {
    res.redirect("/Login");
  }
});

app.post("/ItemAdded", async function(req, res)
{
  if (req.session.loggedin)
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
  }
  else
  {
    res.redirect("/Login");
  }
});

app.post("/ItemDeleted", async function(req, res)
{
  if(req.session.loggedin)
  {
    var itemName = sanitizeHtml(req.body.itemName);
    var itemID = sanitizeHtml(req.body.itemID);
    //waits for the response for database, then continues, utilizing the response string
    await mysql.insertData("DELETE FROM item WHERE Item_ID =  ('" + itemID + "');").then(result => {
    if (result)
    {
      res.render(path.join(__dirname + static_path + "itemDeleted"), {name: itemName, itemID: itemID});  }
    });
  }
  else
  {
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
  var item_quantity_arr = sanitizeHtml(req.body.item_info);
  var salesDate = sanitizeHtml(req.body.salesDate);

  if(req.session.loggedin)
  {
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
  }
  else {
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
  var search_string = sanitizeHtml(req.body.searchString);
  var search_date = sanitizeHtml(req.body.searchDate);
  var start_date = sanitizeHtml(req.body.startDate);
  var end_date = sanitizeHtml(req.body.endDate);

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
    var start_date = sanitizeHtml(req.query.startDate);
      var end_date = sanitizeHtml(req.query.endDate);

      var output_string = "";

      start_date = start_date + "-00";

      if (end_date.length > 0)
      {
        end_date = end_date + "-00";
      }

      var data = [];
      var entry;

      result.forEach(function(element)
      {
        entry = element;
        data.push([element.Sale_Date, element.Quantity]);
      });

      result.forEach(function(element)
      {
        output_string += element.Sale_ID + "," + element.Quantity + "," + element.Item_ID + "," + element.Item_Name + "," +
          element.itmType_ID + "," + element.item_Type + ","+ element.Sale_Date;

          if (prediction == "true")
          {
            output_string += "," + forecast.predictSales(data, 2) + '\n';
          }
          else
          {
            output_string += '\n';
          }
      });

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

          var data = [];
          var entry;

          result.forEach(function(element)
          {
            entry = element;
            data.push([element.Sale_Date, element.Quantity]);
          });


          result.forEach(function(element)
          {
            output_string += element.Sale_ID + "," + element.Quantity + "," + element.Item_ID + "," + element.Item_Name + "," +
              element.itmType_ID + "," + element.item_Type + ","+ element.Sale_Date;

              if (prediction == "true")
              {
                output_string += "," + forecast.predictSales(data, 2) + '\n';
              }
              else
              {
                output_string += '\n';
              }
          });

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
  }
  else
  {
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
    var start_date = sanitizeHtml(req.query.startDate);
    var end_date = sanitizeHtml(req.query.endDate);
    var prediction = req.query.displayPredictions;

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

          var data = [];
          var entry;

          result.forEach(function(element)
          {
            entry = element;
            data.push([element.Sale_Date, element.Quantity]);
          });

        result.forEach(function(element)
        {
          output_string += "<tr><td>" + element.Sale_ID +
          "</td><td>" + element.Quantity +
          "</td><td>" + element.Item_ID +
          "</td><td>" + element.Item_Name +
          "</td><td>" + element.Sale_Date;

          if (prediction == "true")
          {
            output_string += "</td><td>" + forecast.predictSales(data, 2) + "</td></tr>";
          }
          else
          {
            output_string += "</td></tr>";
          }
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

        var data = [];
        var entry;

        result.forEach(function(element)
        {
          entry = element;
          data.push([element.Sale_Date, element.Quantity]);
        });

        result.forEach(function(element)
        {
          output_string += "<tr><td>" + element.Sale_ID +
          "</td><td>" + element.Quantity +
          "</td><td>" + element.Item_ID +
          "</td><td>" + element.Item_Name +
          "</td><td>" + element.Sale_Date;
        });

        if (prediction == "true")
        {
          output_string += "</td><td>" + forecast.predictSales(data, 2) + "</td></tr>";
        }
        else
        {
          output_string += "</td></tr>";
        }

        if (output_string.length == 0)
        {
          output_string = "<p>No Results Found</p>";
        }

      });
    }

    res.render(path.join(__dirname + static_path + "displaySalesReport"), {data: HTMLParser.parse(output_string)});
  }
  else
  {
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

app.get("/ManageUsers", function(req, res)
{
  res.render(path.join(__dirname + static_path + "manageUsers"));
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
app.get("/ViewStockLevels", async function(req, res)
{
    if(req.session.loggedin)
    {
      if (req.query.item_subset != null)
      {
        var search_string = req.query.item_string;

        switch (req.query.item_subset)
        {
          case "all":
            await mysql.selectData("SELECT *, SUM(sales_items.Quantity) as itemsSold, (item.stockQuantity - SUM(sales_items.Quantity)) as itemsRemaining FROM sales_items " +
              "RIGHT JOIN sales ON sales_items.Sale_ID = sales.Sale_ID RIGHT JOIN item ON sales_items.Item_ID = item.Item_ID " +
              "RIGHT JOIN item_types ON item.itmType_ID = item_types.itmType_ID " +
              "GROUP BY (sales_items.Item_ID) HAVING item.Item_Name LIKE '%" + search_string + "%' ORDER BY itemsRemaining DESC").then(result =>
            {
              // Render view and pass result of query to be displayed
              res.render(path.join(__dirname + static_path + "ViewStockLevels"), {ItemData: result});
            });
            break;

          case "pos":
            await mysql.selectData("SELECT *, SUM(sales_items.Quantity) as itemsSold, (item.stockQuantity - SUM(sales_items.Quantity)) as itemsRemaining FROM sales_items " +
              "RIGHT JOIN sales ON sales_items.Sale_ID = sales.Sale_ID RIGHT JOIN item ON sales_items.Item_ID = item.Item_ID " +
              "RIGHT JOIN item_types ON item.itmType_ID = item_types.itmType_ID " +
              "GROUP BY (sales_items.Item_ID) HAVING itemsRemaining > 0 AND item.Item_Name LIKE '%" + search_string + "%' ORDER BY itemsRemaining DESC").then(result =>
            {
              // Render view and pass result of query to be displayed
              res.render(path.join(__dirname + static_path + "ViewStockLevels"), {ItemData: result});
            });
            break;

          case "neg":
            await mysql.selectData("SELECT *, SUM(sales_items.Quantity) as itemsSold, (item.stockQuantity - SUM(sales_items.Quantity)) as itemsRemaining FROM sales_items " +
              "RIGHT JOIN sales ON sales_items.Sale_ID = sales.Sale_ID RIGHT JOIN item ON sales_items.Item_ID = item.Item_ID " +
              "RIGHT JOIN item_types ON item.itmType_ID = item_types.itmType_ID " +
              "GROUP BY (sales_items.Item_ID) HAVING itemsRemaining <= 0 AND item.Item_Name LIKE '%" + search_string + "%' ORDER BY itemsRemaining DESC").then(result =>
            {
              // Render view and pass result of query to be displayed
              res.render(path.join(__dirname + static_path + "ViewStockLevels"), {ItemData: result});
            });
            break;
        }
      }
      else
      {
        await mysql.selectData("SELECT *, SUM(sales_items.Quantity) as itemsSold, (item.stockQuantity - SUM(sales_items.Quantity)) as itemsRemaining FROM sales_items " +
          "RIGHT JOIN sales ON sales_items.Sale_ID = sales.Sale_ID RIGHT JOIN item ON sales_items.Item_ID = item.Item_ID " +
          "RIGHT JOIN item_types ON item.itmType_ID = item_types.itmType_ID " +
          "GROUP BY (sales_items.Item_ID) ORDER BY itemsRemaining DESC").then(result =>
        {
          // Render view and pass result of query to be displayed
          res.render(path.join(__dirname + static_path + "ViewStockLevels"), {ItemData: result});
        });
      }

      // Query database and wait for result response
      // Returns ALL sales records and passes in array
      // Querey database and wait for result response
      // Returns ALL sales records and passes in array
      //Orders by Item ID
  }
  else
  {
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
      // Querey database and wait for result response
      // Returns ALL sales records and passes in array
      //Orders by Item ID
      await mysql.selectData("SELECT * FROM item JOIN item_types ON item.itmType_ID = item_types.itmType_ID ORDER BY item_ID").then(result => {

      // Render view and pass result of query to be displayed
      res.render(path.join(__dirname + static_path + "ViewItemRecords"), {ItemData: result});
    });
  }
  else
  {
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
  if (req.session.loggedin)
  {
    var saleID = sanitizeHtml(req.query.saleID);

    mysql.selectData("SELECT * FROM sales WHERE Sale_ID = '" + saleID +
    "'").then(itemResult =>
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
    });
  }
  else
  {
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
  } else {
    res.redirect("/Login");
  }
});

app.post("/ItemDeleted", async function(req, res)
{
if(req.session.loggedin)
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
}
else
{
  res.redirect("/Login");
}
});

app.get("/DeleteItemType", async function(req, res)
{
  if(req.session.loggedin)
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
  } else {
    res.redirect("/Login");
  }
});

app.post("/ItemTypeDeleted", async function(req, res)
{
if(req.session.loggedin)
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
}
else {
    res.redirect("/Login");
  }
});

//Edit Item Page
app.get("/EditItem", async function(req, res)
{
  if(req.session.loggedin)
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
  } else {
    res.redirect("/Login");
  }
});

app.get("/DeleteItem", async function(req, res)
{
if(req.session.loggedin)
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
  } else {
    res.redirect("/Login");
  }
});

app.post("/ItemEdited", async function(req, res)
{
  if(req.session.loggedin)
  {
    var itemName = sanitizeHtml(req.body.itemName);
    var itemPrice = sanitizeHtml(req.body.itemPrice);
    var itemID = sanitizeHtml(req.body.itemID);
    var itemType = sanitizeHtml(req.body.itemType);
    var itemStock = sanitizeHtml(req.body.itemStock);
    //waits for the response for database, then continues, utilizing the response string
    // await mysql.insertData("UPDATE item SET Item_Name = '" + itemName + "', Price = '" + itemPrice +
    //   "', itmType_ID = '" + itemType + "' WHERE Item_ID = '" + itemID + "'").then(result => {

    await mysql.insertData("UPDATE item SET Item_Name = '" + itemName + "', Price = '" + itemPrice +
      "', itmType_ID = '" + itemType + "', stockQuantity = '" + itemStock + "' WHERE Item_ID = '" + itemID + "'").then(result => {

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
  } else {
    res.redirect("/Login");
  }
});

app.post("/ItemTypeEdited", async function(req, res)
{
  if(req.session.loggedin)
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
    await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON item.Item_ID = sales_items.Item_ID ORDER BY sales.Sale_Date").then(result => {

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
    var searchString = sanitizeHtml(req.query.searchString);
    await mysql.selectData("SELECT *, (item.stockQuantity - SUM(sales_items.Quantity)) as itemsRemaining, SUM(sales_items.Quantity) as itemsSold FROM sales_items RIGHT JOIN item ON sales_items.Item_ID = item.Item_ID WHERE item.Item_Name LIKE '%" + searchString + "%' GROUP BY sales_items.Item_ID, item.Item_ID").then(result => {
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
    var itemID = sanitizeHtml(req.query.itemID);
    await mysql.selectData('SELECT *, (item.stockQuantity - SUM(sales_items.Quantity)) as itemsRemaining, SUM(sales_items.Quantity) as itemsSold FROM sales_items RIGHT JOIN item ON sales_items.Item_ID = item.Item_ID WHERE item.Item_ID = "' + itemID + '"  GROUP BY sales_items.Item_ID, item.Item_ID').then(result => {
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
  }
  else
  {
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
  }
  else
  {
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

      await mysql.selectData("SELECT * FROM sales RIGHT JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID RIGHT JOIN item ON sales_items.Item_ID = item.Item_ID WHERE sales_items.Item_ID = '" +
        item_id + "' ORDER BY sales.Sale_Date ASC").then(result => {
        var entry;

        result.forEach(function(element)
        {
          entry = element;
          data.push([element.Sale_Date, element.Quantity]);
          table_string += "<tr><td>" + element.Sale_Date +"</td><td>" + element.Quantity + "</td></tr>";
        });

        if (result.length > 0)
        {
          res.render(path.join(__dirname + static_path + "forecastForItem"), {item_id: item_id, graph: forecast.getGraphURL(data, 2), name: entry.Item_Name, price: entry.Price, data: HTMLParser.parse(table_string), forecast: forecast.predictSales(data, 2)});
        }
        else
        {
          res.render(path.join(__dirname + static_path + "forecastForItem"), {item_id: item_id, graph: '', name: '', price: '', data: '<p>NO DATA PRESENT</p>', forecast: ''});
        }
    });
  }
  else
  {
    if(req.session.loggedin)
    {
      var item_id = req.query.itemID;
      var data = [];
      var table_string = "";
      var graphURL="";
        await mysql.selectData("SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID WHERE sales_items.Item_ID = '" +
          item_id + "' ORDER BY sales.Sale_Date ASC").then(result => {
          var entry;

          result.forEach(function(element)
          {
            entry = element;
            data.push([element.Sale_Date, element.Quantity]);
            table_string += "<tr><td>" + element.Sale_Date +"</td><td>" + element.Quantity + "</td></tr>";
          });

          //get the google image chart URL and customize
          graphURL=forecast.getGraphURL(data,2)+"&chtt=Sales+Prediction+Graph&chdl=Past+Sale|Predicted+Sales&chco=ff0000,F19AFF&chxt=x,x,y,y&chxl=1:|Date|2:|1|5|10|3:|Quantity&chxp=1,50|3,50";
          res.render(path.join(__dirname + static_path + "forecastForItem"), {item_id: item_id, graph: graphURL, name: entry.Item_Name, price: entry.Price, data: HTMLParser.parse(table_string), forecast: forecast.predictSales(data, 2)});
      });
    }
    else
    {
      res.redirect("/Login");
    }
}
});

app.get("/SalesGraph", async function(req, res)
  {
    if(req.session.loggedin)
    {
      var item_id = req.query.itemID;
      var data = [];
      var table_string = "";
      var graphURL="";

      var start_date = req.query.start_date;
      var end_date = req.query.end_date;

      var sql_string = "";

      if (start_date != null)
      {
        if (start_date.length == 0)
        {
          start_date = null;
        }
      }

      if (end_date != null)
      {
        if (end_date.length == 0)
        {
          end_date = null;
        }
      }

      if (start_date != null)
      {
        if (end_date == null)
        {
          sql_string = "SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID WHERE sales_items.Item_ID = '" +
            item_id + "' AND sales.Sale_Date >= CONVERT('" + start_date + "', date) ORDER BY sales.Sale_Date ASC";
        }
        else
        {
          sql_string = "SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID WHERE sales_items.Item_ID = '" +
            item_id + "' AND sales.Sale_Date >= CONVERT('" + start_date + "', date) AND sales.Sale_Date <= CONVERT('" + end_date + "', date) ORDER BY sales.Sale_Date ASC";
        }
      }
      else if (end_date != null)
      {
        sql_string = "SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID WHERE sales_items.Item_ID = '" +
          item_id + "' AND sales.Sale_Date <= CONVERT('" + end_date + "', date) ORDER BY sales.Sale_Date ASC";
      }
      else
      {
        sql_string = "SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID WHERE sales_items.Item_ID = '" +
          item_id + "' ORDER BY sales.Sale_Date ASC";
      }

      console.log(sql_string);

        await mysql.selectData(sql_string).then(result => {
          var entry;

          result.forEach(function(element)
          {
            entry = element;
            data.push([element.Sale_Date, element.Quantity]);
            table_string += "<tr><td>" + element.Sale_Date +"</td><td>" + element.Quantity + "</td></tr>";
          });

          //get the google image chart URL and customize
          graphURL=forecast.getGraphURL(data)+"&chtt=Sales+Record&chxt=x,x,y,y&chxl=1:|Date|2:|1|5|10|3:|Quantity&chxp=1,50|3,50";
          if (result.length > 0)
          {
            res.render(path.join(__dirname + static_path + "salesGraph"), {item_id: item_id, graph: graphURL, name: entry.Item_Name, price: entry.Price, data: HTMLParser.parse(table_string), forecast: forecast.predictSales(data, 2)});
          }
          else
          {
            res.render(path.join(__dirname + static_path + "salesGraph"), {item_id: item_id, graph: graphURL, name: '', price: '', data: HTMLParser.parse(table_string), forecast: forecast.predictSales(data, 2)});
          }
      });
    }
    else
    {
      res.redirect("/Login");
    }
});
app.get("/ForecastItemType", async function(req, res)
{
  if(req.session.loggedin)
  {
    var item_type_id = sanitizeHtml(req.query.itemType);
    var data = [];
    var table_string = "";

    var start_date = req.query.start_date;
    var end_date = req.query.end_date;

    var sql_string = "";

    if (start_date != null)
    {
      if (start_date.length == 0)
      {
        start_date = null;
      }
    }

    if (end_date != null)
    {
      if (end_date.length == 0)
      {
        end_date = null;
      }
    }

    if (start_date != null)
    {

      if (end_date == null)
      {
        sql_string = "SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID JOIN item_types ON item.itmType_ID = item_types.itmType_ID WHERE item.itmType_ID = '" +
          item_type_id + "' AND sales.Sale_Date >= CONVERT('" + start_date + "', date) ORDER BY sales.Sale_Date ASC";
      }
      else
      {
        if (end_date != 'null')
        {
          sql_string = "SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID JOIN item_types ON item.itmType_ID = item_types.itmType_ID WHERE item.itmType_ID = '" +
            item_type_id + "' AND sales.Sale_Date >= CONVERT('" + start_date + "', date) AND sales.Sale_Date <= CONVERT('" + end_date + "', date) ORDER BY sales.Sale_Date ASC";
        }
        else
        {
          sql_string = "SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID JOIN item_types ON item.itmType_ID = item_types.itmType_ID WHERE item.itmType_ID = '" +
            item_type_id + "' AND sales.Sale_Date >= CONVERT('" + start_date + "', date) ORDER BY sales.Sale_Date ASC";
        }
      }
    }
    else if (end_date != null)
    {
      sql_string = "SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID JOIN item_types ON item.itmType_ID = item_types.itmType_ID WHERE item.itmType_ID = '" +
        item_type_id + "' AND sales.Sale_Date <= CONVERT('" + end_date + "', date) ORDER BY sales.Sale_Date ASC";
    }
    else
    {
      sql_string = "SELECT * FROM sales JOIN sales_items ON sales.Sale_ID = sales_items.Sale_ID JOIN item ON sales_items.Item_ID = item.Item_ID JOIN item_types ON item.itmType_ID = item_types.itmType_ID WHERE item.itmType_ID = '" +
        item_type_id + "' ORDER BY sales.Sale_Date ASC";
    }

      await mysql.selectData(sql_string).then(result => {
        var entry;

        result.forEach(function(element)
        {
          entry = element;
          data.push([element.Sale_Date, element.Quantity]);
          table_string += "<tr><td>" + element.Item_Name + "</td><td>" + element.Sale_Date +"</td><td>" + element.Quantity + "</td></tr>";
        });

        if (result.length > 0)
        {
          res.render(path.join(__dirname + static_path + "forecastForItemType"), {item_type_id: item_type_id, graph: forecast.getGraphURL(data, 2), name: entry.Item_Name, price: entry.Price, data: HTMLParser.parse(table_string), forecast: forecast.predictSales(data, 2)});
        }
        else
        {
          try
          {
            res.render(path.join(__dirname + static_path + "forecastForItemType"), {item_type_id: item_type_id, graph: '', name: entry.Item_Name, price: entry.Price, data: '<p>NO DATA PRESENT</p>', forecast: ''});
          }
          catch (error)
          {
            res.render(path.join(__dirname + static_path + "forecastForItemType"), {item_type_id: item_type_id, graph: '', name: '', price: '', data: '<p>NO DATA PRESENT</p>', forecast: ''});
          }
        }

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
