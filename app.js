import express from "express";
import { publicIp } from "public-ip";
import fetch from "node-fetch";

const app = express();
const WEATHER_API_KEY = "385f48105fdf4d99bc4113759240207";

// Middleware to handle async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get(
  "/api/hello",
  asyncHandler(async (req, res) => {
    const ipAddress = await publicIp();
    const visitorName = req.query.visitor_name || "Guest";

    const [ipApiResponse, weatherApiResponse] = await Promise.all([
      fetch(`https://ipapi.co/${ipAddress}/json/`),
      fetch(
        `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=auto:ip`
      ),
    ]);

    const ipData = await ipApiResponse.json();
    const weatherData = await weatherApiResponse.json();

    if (weatherData.current && ipData.city) {
      const temperature = weatherData.current.temp_c;
      res.send({
        client_ip: ipAddress,
        location: ipData.city,
        greeting: `Hello, ${visitorName}!, the temperature is ${temperature} degrees Celsius in ${ipData.city}`,
      });
    } else {
      res.status(500).send("Error getting weather information");
    }
  })
);

app.listen(3000, () => {
  console.log("Server started on port http://localhost:3000");
});
