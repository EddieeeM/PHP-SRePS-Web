var mysql = require('mysql');
// const async = require('async');

// Connects to the Database
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
  con = mysql.createConnection(config);
  con.connect(function(err)
  {
    if (err)
    {
      console.log(err);
      con.end();
      throw err;
      return false;
    }});

     //Queries
     var ItemTypes = "CREATE TABLE IF NOT EXISTS Item_Types (itmType_ID INT(8) UNSIGNED AUTO_INCREMENT PRIMARY KEY, item_Type VARCHAR(20) NOT NULL);";
     var ItemTable = "CREATE TABLE IF NOT EXISTS Item (Item_ID INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY, Item_Name VARCHAR(20) NOT NULL, Price FLOAT(6) UNSIGNED NOT NULL, itmType_ID INT(8) UNSIGNED NOT NULL, FOREIGN KEY (itmType_ID) REFERENCES Item_Types(itmType_ID));";
     var SalesTable = "CREATE TABLE IF NOT EXISTS Sales (Sale_ID INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY, Item_ID INT(6) UNSIGNED NOT NULL, Sale_Date DATE, Quantity INT(3), FOREIGN KEY (Item_ID) REFERENCES Item(Item_ID));";

     //Stores queries into one variable.
     var query = ItemTypes + ItemTable + SalesTable;

     var query_output = con.query(query, function (err, result)
     {
      if (err)
      {
        console.log(err);
        con.end();
        throw err;
        return false;
      }

      console.log("Created new Tables");
      return true;
     });

   return query_output;

  con.end();
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
