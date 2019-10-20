function show_prediction(item_id, get_var, route)
{
  $("#prediction_frame").show();
  $("#display_frame").attr("src", "./" + route + "?" + get_var + "=" + item_id);
}

function displayRangeRange()
{
  if ($("#extended_range").is(":hidden"))
  {
    $("#extended_range").show();
  }
  else
  {
    $("#extended_range").hide();
  }
}

//draws new section to page, gets infomation for section from input item_id
function draw_item_input(item_id, item_capacity)
{
  //ajax request to get a list of return objects
  $.ajax({url: "/getItemByID?itemID=" + item_id, success: function(result){
    var item_result;
    var Stock_Remaining_String;
    //loops through return objects, selecting the last on
    result.forEach(function(element)
    {
      item_result = element;
    });


    if (item_result == null)
    {
      if (!isNaN(parseFloat(item_result.itemsRemaining)))
      {
        Stock_Remaining_String = "| Stock Remaining: " + parseFloat(item_result.itemsRemaining);
      }
      else
      {
        Stock_Remaining_String = "";
      }

      //prints to page the item selection element with item specific details
      $("#item_selection").append("<div id='" + item_result.Item_ID + "'><fieldset><p>Item: <strong>" + item_result.Item_Name
       + "</strong>" + "</p><p><label for='quantity_" + parseInt(item_result.Item_ID) + "'>Quantity: </label> <input type='number' min='1' id='quantity_" +
       parseInt(item_result.Item_ID) + "'/></p><button class='formBtn' id='remove_element' name='remove_element' value='" + item_result.Item_ID + "'>Remove</button></fieldset></div>");

    }
    else
    {
      //prints to page the item selection element with item specific details
      $("#item_selection").append("<div id='" + item_result.Item_ID + "'><fieldset><p>Item: <strong>" + item_result.Item_Name
       + "</strong>" + "</p><p><label for='quantity_" + parseInt(item_result.Item_ID) + "'>Quantity: </label> <input type='number' id='quantity_" +
       parseInt(item_result.Item_ID) + "' value='" + item_capacity + "'/></p><button id='remove_element' name='remove_element' value='" + item_result.Item_ID + "'>Remove</button></fieldset></div>");
    }
  }
  });
}

//gets the quantity selection for all of the sale items
function collect_item_data()
{
  //loops through all elements in items_arr array, constructs multi dimensional item_id_array
  //the array has item id at position 1 and item quantity at position 2
  for (i = 0; i < items_arr.length; i++)
  {
    return_arr.push([items_arr[i],  $("#" + items_arr[i]).find("input").val()]);
  }

  var item_info = " ";
  //through through the constructed return arr, and construct a string out of the array
  for (i = 0; i < return_arr.length; i++)
  {
    item_info += "["
    for (j = 0; j < return_arr[i].length; j++)
    {
      item_info += return_arr[i][j].toString();

      if (j < (return_arr[i].length - 1))
      {
        item_info += ",";
      }
    }

    item_info += "]"

    if (i < (return_arr.length - 1))
    {
      item_info += ",";
    }
  }

  //writes the itme_info string to the input with
  $("#item_info").val(item_info);
  return_arr = [];
}

function getCSVDownload()
{
  var url = window.location.href;
  var get_vars = url.split("?")[1];
  get_vars = url.split("&")

  $("#downloadCSV").html("<a href='localhost:3001/DownloadCSV?startDate=" + get_vars[0].split("=")[1] + "&endDate=" + get_vars[1].split("=")[1] + "'>Download CSV Report</a>");

}
