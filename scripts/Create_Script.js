var mysql = require('mysql');
// const async = require('async');

// Connects to the Database
var con = mysql.createConnection({
    multipleStatements: true,
    host: "localhost:8080", 
    user: "testUsername", 
    password: "testPassword", 
    database: "PeopleHealth"
});

con.connect(function(err)
{
   if (err) throw err;
   console.log ("Connected to " + database);
   
   //Queries
   var ItemTypes = "CREATE TABLE Item_Types (itmType_ID INT(8) UNSIGNED AUTO_INCREMENT PRIMARY KEY, item_Type VARCHAR(20) NOTNULL)";
   var ItemTable = "CREATE TABLE Item (Item_ID INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY, Item_Name VARCHAR(20) NOT NULL, Price FLOAT(6) UNSIGNED NOT NULL, itmType_ID INT(8) UNSIGNED NOT NULL, FOREIGN KEY (itmType_ID) REFERENCES Item_Types(itmType_ID))";
   var SalesTable = "CREATE TABLE Sales (Sale_ID INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY, Item_ID INT(6) UNSIGNED NOT NULL, Sale_Date DATE, Quantity INT(3), FOREIGN KEY (Item_ID) REFERENCES Items(Item_ID))";

   //Stores queries into one variable.
   var query = ItemTypes; ItemTable; SalesTable;

   con.query(query, function (err, result)
   {
    if (err) throw err;
    console.log("Created new Tables");
    // console.log(result[0]); // [{1: 1}]
    // console.log(result[1]); // [{2: 2}]
    // console.log(result[2]); // [{3: 3}]
   });
});

con.end();

//    con.query(ItemTypes, function (err, result)
//    {
//     if (err) throw err;
//     console.log("Created Item Table");
//     console.log(result);
//    });

//    con.query(ItemTable, function (err, result)
//    {
//     if (err) throw err;
//     console.log("Created Item Table");
//     console.log(result);
//    });

//    con.query(SalesTable, function (err, result)
//    {
//     if (err) throw err;
//     console.log("Created Sales Table");
//     console.log(result);
//    });