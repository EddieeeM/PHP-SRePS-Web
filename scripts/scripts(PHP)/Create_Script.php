<?php
    //Settings
    $servername = "localhost:8080";
    $username = "testUsername";
    $pwd = "testPassword";
    $dbname = "PeopleHealth";

    // require_once "settings.php";

    //Connects to the Database
    //Checks the connection before running the script...
    $conn = @sqli_connect(
        $servername, $username, $pwd, $dbname
    );

    if (!$conn)
    {
        echo "Unable to Connect to " + $dbname;
    }
    else
    {
        echo "Successful Connection to " + $dbname; 
        session_start();
        
        //Creation Scripts
        $sql_ItemTypes = "CREATE TABLE Item_Types
        (
            itmType_ID INT(8) UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
            Item_Type VARCHAR (20) NOT NULL
        )";

        $sql_ItemTable = "CREATE TABLE Item 
        (
            Item_ID INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
            Item_Name VARCHAR (20) NOT NULL, 
            Price INT(6) UNSIGNED NOT NULL, 
            itmType_ID INT(8) UNSIGNED, 
            FOREIGN KEY (itmType_ID) REFERENCES Item_Types(itmType_ID)
        )";

        $sql_SalesTable = "CREATE TABLE Sales
        (
            Sale_ID INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
            Item_ID INT (6) UNSIGNED NOT NULL, 
            Sale_Date DATE, 
            Quantity INT (3),
            FOREIGN KEY (Item_ID) REFERENCES Items(Item_ID)
    
        )";
        
        //Checks if the table has been created; otherwise will echo that the tables are all up on the database.
        if ($result_ItemTypes != null)
        {
            $result_ItemTypes = mysqli_query($conn, $sql_ItemTypes);
        } 
        else if ($result_ItemTable != null)
        {
            $result_ItemTable = mysqli_query($conn, $sql_ItemTable);
        } 
        else if ($result_SalesTable != null)
        {
            $result_SalesTable = mysqli_query($conn, $sql_SalesTable);
        } 
        else 
        {
            echo "Created all tables within " + $dbname;
        };

        mysqli_close($conn);
    };

?> 