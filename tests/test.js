//TO RUN, type: mocha ./tests/test.js (assume your current file path is set at project root path)

const mysql = require("../scripts/Create_Script.js");

var assert = require('assert');



describe('Test DB Create', function()
{
  //drop all tables, then check

  it('Should Create Database tables', function()
  {
    assert(mysql.createDB());
  });
});


//insert, insert test data, then make duplicate, to ensure that it doesn't result in error?

//etc
