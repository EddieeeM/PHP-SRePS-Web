const timeseries = require("timeseries-analysis");

exports.predictSales = function(input_data, smoothing_amount)
{
  if (input_data.length >= 7)
  {
    if (smoothing_amount == null)
    {
      smoothing_amount = 2;
    }

    var t = new timeseries.main(input_data);
    //the more smoothing present, the more it predict the general trend
    t.smoother({period:smoothing_amount}).save('smoothed');

    //sample = number of past data points Used
    t.sliding_regression_forecast({sample:input_data.length, degree: 5});

    var coeffs = t.ARMaxEntropy({
      data:	t.data.slice(0,input_data.length - 1)
    });

    // Now, we calculate the forecasted value of that n+1 datapoint using the AR coefficients:
    var forecast	= 0;	// Init the value at 0.
    for (var i=0; i < coeffs.length; i++)
    {	// Loop through the coefficients
        forecast -= parseInt(t.data[parseInt(input_data.length - 1) - i][1]) * coeffs[i];
        // Explanation for that line:
        // t.data contains the current dataset, which is in the format [ [date, value], [date,value], ... ]
        // For each coefficient, we substract from "forecast" the value of the "N - x" datapoint's value, multiplicated by the coefficient, where N is the last known datapoint value, and x is the coefficient's index.
    }

    return forecast;
  }
  else
  {
    return "Not Enough Data for Prediction";
  }
}

exports.predictSalesFurther = function(input_data, smoothing_amount, number_of_sales, counter)
{
  if (counter == null)
  {
    counter = 0;
  }
  else if (counter == number_of_sales)
  {
    return exports.predictSales(input_data, smoothing_amount).toString();
  }

  var prediction = exports.predictSales(input_data, smoothing_amount);

  console.log(input_data[input_data.length - 1][0].toISOString());

  var date_string = input_data[input_data.length - 1][0].toISOString().split('T')[0];
  var last_date = new Date(date_string.split("-")[0], date_string.split("-")[1] - 1, date_string.split("-")[2]);
  last_date = new Date(last_date.valueOf() + 1000*3600*24);

  new_date = new Date(last_date.valueOf() + 1000*3600*24);

  input_data.push([new_date, prediction]);
  counter = counter + 1;

  exports.predictSalesFurther(input_data, smoothing_amount, number_of_sales, counter);
}

exports.getGraphURL = function(input_data, smoothing_amount)
{
  if (smoothing_amount == null)
  {
    smoothing_amount = 2;
  }

  // Load the data
  var t = new timeseries.main(input_data);

  //sample = number of past data points Used
  t.smoother({period:smoothing_amount}).save('smoothed');

  t.sliding_regression_forecast({sample:input_data.length, degree: 5});

  return t.chart({main:true,points:[{color:'ff0000',point:input_data.length,serie:0}]});
}

exports.getGraph = function(input_data)
{
  // Load the data
  var t = new timeseries.main(input_data);
  return t.chart({main:true,points:[{color:'ff0000',point:input_data.length,serie:0}]});
}