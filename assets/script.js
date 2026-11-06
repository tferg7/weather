// OpenWeather key. Free-tier keys are visible in any front-end app; restrict or rotate it in your OpenWeather account if needed.
var API_KEY = "41e57c1f78973f401f5499f98795c5c2";
var HISTORY_KEY = "cityHistory";
var MAX_HISTORY = 8;

//---------------------------- Helpers ----------------------------//
// OpenWeather returns an icon code (e.g. "10d") for every condition, including storms and fog
function iconFor(weather, size) {
  return $("<img>")
    .attr("src", "https://openweathermap.org/img/wn/" + weather.icon + "@2x.png")
    .attr("alt", weather.description)
    .css({ height: size + "px", width: size + "px" });
}

// UV index color bands (EPA scale)
function uvClass(uv) {
  if (uv < 3) return "bg-success";
  if (uv < 6) return "bg-warning";
  if (uv < 8) return "bg-orange";
  return "bg-danger";
}

function showError(message) {
  $("#current").html($("<p class='text-danger'>").text(message));
  $("#uv").empty();
  $("#5day").empty();
}

//---------------------------- Current weather ----------------------------//
function searchCity(cityname) {
  var city = encodeURIComponent(cityname);
  var queryURL = "https://api.openweathermap.org/data/2.5/weather?q=" + city + "&units=imperial&appid=" + API_KEY;
  var queryURLforecast = "https://api.openweathermap.org/data/2.5/forecast?q=" + city + "&units=imperial&appid=" + API_KEY;

  $.ajax({ url: queryURL, method: "GET" })
    .then(function (response) {
      // only remember cities the API actually found
      addToHistory(response.name);

      var mainDate = moment().format("dddd, MMM D");
      var cityNameEl = $("<h2>").text(response.name + " " + mainDate);
      var tempEl = $("<p>").text("Temperature: " + Math.round(response.main.temp) + " °F");
      var humEl = $("<p>").text("Humidity: " + response.main.humidity + "%");
      var windEl = $("<p>").text("Wind Speed: " + response.wind.speed + " mph");

      var newDiv = $("<div>").append(cityNameEl, iconFor(response.weather[0], 60), tempEl, humEl, windEl);
      $("#current").html(newDiv);

      getUV(response.coord.lat, response.coord.lon);
      getForecast(queryURLforecast);
    })
    .catch(function (err) {
      if (err.status === 404) {
        showError("City not found. Check the spelling and try again.");
      } else {
        showError("Couldn't load the weather right now. Please try again.");
      }
    });
}

//---------------------------- UV index ----------------------------//
// OpenWeather retired its free /uvi endpoint, so UV comes from Open-Meteo (free, no key)
function getUV(lat, lon) {
  var queryURLUV = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&daily=uv_index_max&timezone=auto";

  $.ajax({ url: queryURLUV, method: "GET" })
    .then(function (response) {
      var uv = response.daily.uv_index_max[0];
      var uvEl = $("<span class='badge p-2 text-white'>")
        .addClass(uvClass(uv))
        .text("UV Index (today's max): " + uv);
      $("#uv").html(uvEl);
    })
    .catch(function () {
      $("#uv").text("UV index unavailable");
    });
}

//---------------------------- 5-day forecast ----------------------------//
function getForecast(queryURLforecast) {
  $.ajax({ url: queryURLforecast, method: "GET" }).then(function (response) {
    var results = response.list;
    $("#5day").empty();

    // the forecast comes in 3-hour steps; use the reading closest to midday for each day
    var middays = results.filter(function (item) {
      return item.dt_txt.indexOf("12:00:00") !== -1;
    });
    if (middays.length < 5) {
      middays = results.filter(function (item, i) {
        return i % 8 === 0;
      });
    }

    middays.slice(0, 5).forEach(function (item) {
      var fiveDayDiv = $("<div class='card shadow-lg text-white bg-primary mx-auto mb-3 p-2' style='width: 8.5rem;'>");
      var h5date = $("<h5 class='card-title'>").text(moment(item.dt_txt).format("ddd M/D"));
      var pTemp = $("<p class='card-text'>").text("Temp: " + Math.round(item.main.temp) + " °F");
      var pHum = $("<p class='card-text'>").text("Humidity: " + item.main.humidity + "%");

      fiveDayDiv.append(h5date, iconFor(item.weather[0], 40), pTemp, pHum);
      $("#5day").append(fiveDayDiv);
    });
  });
}

//---------------------------- Search history ----------------------------//
function getHistory() {
  try {
    var saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (e) {
    return [];
  }
}

function addToHistory(city) {
  var history = getHistory().filter(function (c) {
    return c.toLowerCase() !== city.toLowerCase();
  });
  history.unshift(city);
  history = history.slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    // storage unavailable (private mode); history just won't persist
  }
  renderHistory();
}

function renderHistory() {
  var $history = $("#searchhistory").empty();
  getHistory().forEach(function (city) {
    var btn = $("<button type='button' class='btn border text-muted mt-1 shadow-sm bg-white rounded d-block' style='width: 12rem;'>").text(city);
    $history.append(btn);
  });
}

//---------------------------- Events ----------------------------//
$("#select-city").on("click", function (event) {
  // keep the form from reloading the page
  event.preventDefault();
  var cityInput = $("#city-input").val().trim();
  if (!cityInput) return;

  searchCity(cityInput);
  $("#city-input").val("");
});

// event delegation for history buttons
$("#searchhistory").on("click", ".btn", function (event) {
  event.preventDefault();
  searchCity($(this).text());
});

// on load: show history and the last city searched
renderHistory();
var lastCity = getHistory()[0];
if (lastCity) {
  searchCity(lastCity);
}
