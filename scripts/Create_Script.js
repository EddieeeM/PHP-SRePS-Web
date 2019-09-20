var mysql = require('mysql');
const async = require('async');

// Used for Creating Database and Tables...
var initialconfig = {
    multipleStatements: true,
    host: "localhost",
    user: "root",
    password: "",
    database: "",
    port: 3306
};

// Used for all other queries...
var config = {
  multipleStatements: true,
  host: "localhost",
  user: "root",
  password: "",
  port: 3306,
  database: "peoplehealth"
};  


//creates initial DB structure
exports.createDB = function(){

  //Initial connection
  conInitial = mysql.createConnection(initialconfig);

  conInitial.connect(function(err)
  {
    if (err)
    {
      console.log(err);
      conInitial.end();
      throw err;
      return false;
    }});
  
  //Creates new database
  var newDb = "CREATE DATABASE IF NOT EXISTS peoplehealth;";

  conInitial.query(newDb, function (err, result)
  {
    if (err) {
      console.log(err);
      console.log("Database already exists!")
      conInitial.end();
      throw err;
      return false;
    } 
    
    console.log("Database 'peoplehealth' detected!");
    return result;
  });
  conInitial.end();
}

//Creates Tables in DB
exports.createTables = function(){

  var con = mysql.createConnection(initialconfig);
  
  //Reconnects to run table scripts
  con.connect(function(err)
  {

    if (err)
    {
      console.log(err);
      console.log("Unable to find 'peoplehealth' database")
      con.end();
      throw err;
      return false;
    }});

    //Queries
    var ItemTypes = "USE peoplehealth; CREATE TABLE IF NOT EXISTS Item_Types (itmType_ID INT(8) UNSIGNED AUTO_INCREMENT PRIMARY KEY, item_Type VARCHAR(20) NOT NULL);";
    var ItemTable = "USE peoplehealth; CREATE TABLE IF NOT EXISTS Item (Item_ID INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY, Item_Name VARCHAR(20) NOT NULL, Price FLOAT(6) UNSIGNED NOT NULL, itmType_ID INT(8) UNSIGNED NOT NULL, FOREIGN KEY (itmType_ID) REFERENCES Item_Types(itmType_ID));";
    var SalesTable = "USE peoplehealth; CREATE TABLE IF NOT EXISTS Sales (Sale_ID INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY, Item_ID INT(6) UNSIGNED NOT NULL, Sale_Date DATE, Quantity INT(3), FOREIGN KEY (Item_ID) REFERENCES Item(Item_ID));";

    //Runs all the create Table Queries
    async.parallel([
      function(parallel_complete){
        con.query(ItemTypes, {}, function(err, results)
        {
        if (err) return parallel_complete (err);
          console.log("Created Item Types Table successfully");
          return results;
        });
      },
      function(parallel_complete){
        con.query(ItemTable, {}, function(err, results) 
        {
        if (err) return parallel_complete (err);
          console.log("Created Item Table successfully");
          return results;
        });
      },
      function(parallel_complete){
        con.query(SalesTable, {}, function(err, results) 
        {
          if (err) return parallel_complete (err);
            console.log("Created Item Sales Table successfully");
            return results;
        });
      }
      ], function(err){
        if (err) 
          console.log(err);
          con.end();
      });
}

//SQL SELECT DATA
exports.selectData = async function(sql_command)
{
  con = mysql.createConnection(config);
  await con.connect(function(err)
  {
    if (err)
    {
      console.log(err);
      con.end();
      throw err;
    }});

    //Queries db, waits for a response from the DB then returns the output
    var output = await sql_wait_for_result(con, sql_command);

    con.end();
    return output;
}

exports.insertData = async function(sql_command)
{
  con = mysql.createConnection(config);
  await con.connect(function(err)
  {
    if (err)
    {
      console.log(err);
      con.end();
      throw err;
      return false;
    }
  });

    //Queries db, waits for a response from the DB then returns the output
    var output = await sql_wait_for_result(con, sql_command);

    con.end();

    if (output)
    {
        return true;
    }

    return false;
}

//waits for input query to complete
function sql_wait_for_result(con, query)
{
  return new Promise((res, rej) =>
  {
    con.query(query, function(err, result)
    {
      if (err)
      {
        console.log(err);
        con.end();
        throw err;
        return false;
      }

      res(result);
      return result;

    });
  });

}
