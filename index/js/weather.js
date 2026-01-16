// /index/js/weather.js

let weatherLoaded = false;

export function initWeather() {
  if (weatherLoaded) return;
  weatherLoaded = true;
  loadWeather();
}

/* --------------------------------------------------
   WEATHER WIDGET
-------------------------------------------------- */
async function loadWeather() {
  const emojiEl = document.querySelector(".weather-emoji");
  const textEl = document.querySelector(".weather-text");
  if (!emojiEl || !textEl) return;

  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast" +
        "?latitude=51.65&longitude=-3.45" +
        "&current_weather=true" +
        "&hourly=apparent_temperature,precipitation_probability" +
        "&daily=sunrise,sunset" +
        "&timezone=auto"
    );

    const data = await res.json();
    const temp = Math.round(data.current_weather.temperature);
    const feels = Math.round(data.hourly.apparent_temperature[0]);
    const code = data.current_weather.weathercode;
    const precipProb = data.hourly.precipitation_probability?.[0] ?? null;

    const { emoji, message } = buildWeatherMessage({
      temp,
      feels,
      code,
      precipProb
    });

    emojiEl.textContent = emoji;
    textEl.textContent = message;
  } catch (err) {
    console.error("🌧️ Weather load failed:", err);
    textEl.textContent = "Weather’s having a moment — butt. Try again in a bit.";
  }
}

/* --------------------------------------------------
   WEATHER MESSAGE BUILDER
-------------------------------------------------- */
function buildWeatherMessage({ temp, feels, code, precipProb }) {
  let emoji = "🌤️";
  let mood = "Another tidy day in the Rhondda";

  if ([0].includes(code)) {
    emoji = "☀️";
    mood = "Sun’s out over the Rhondda";
  } else if ([1, 2].includes(code)) {
    emoji = "🌤️";
    mood = "Bit of cloud, still tidy out";
  } else if ([3].includes(code)) {
    emoji = "☁️";
    mood = "Clouds over the valley, still alright";
  } else if ([45, 48].includes(code)) {
    emoji = "🌫️";
    mood = "Bit murky in the Rhondda today";
  } else if ([51, 53, 55, 61, 63].includes(code)) {
    emoji = "🌦️";
    mood = "Patchy rain about the place";
  } else if ([65, 80, 81, 82].includes(code)) {
    emoji = "🌧️";
    mood = "Proper Rhondda rain, grab a coat";
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    emoji = "❄️";
    mood = "Snowy vibes in the Rhondda";
  } else if ([95, 96, 99].includes(code)) {
    emoji = "⛈️";
    mood = "Thunder about — bit lively out there";
  }

  let precipText = "";
  if (precipProb !== null) {
    if (precipProb >= 70) precipText = " High chance of rain, mind.";
    else if (precipProb >= 40) precipText = " Might get a shower or two.";
    else if (precipProb >= 20) precipText = " Small chance of a shower.";
    else precipText = " Nice chance it stays dry.";
  }

  return {
    emoji,
    message: `${mood} · ${temp}°C (feels ${feels}°C).${precipText}`
  };
}
