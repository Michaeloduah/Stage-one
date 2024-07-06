import express from "express";
import { publicIp } from "public-ip";
import fetch from "node-fetch";
import NodeCache from "node-cache";

const app = express();
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || "385f48105fdf4d99bc4113759240207";
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Middleware to handle async errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get("/api/hello", asyncHandler(async (req, res) => {
  const visitorName = req.query.visitor_name || "Guest";

  // Check if the response is in the cache
  const cacheKey = 'ip_weather_info';
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    return res.send({
      ...cachedResponse,
      greeting: `Hello, ${visitorName}!, the temperature is ${cachedResponse.temperature} degrees Celsius in ${cachedResponse.location}`,
    });
  }

  const ipAddress = await publicIp();

  const [ipApiResponse, weatherApiResponse] = await Promise.all([
    fetch(`https://ipapi.co/${ipAddress}/json/`),
    fetch(`http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=auto:ip`)
  ]);

  const ipData = await ipApiResponse.json();
  const weatherData = await weatherApiResponse.json();

  if (weatherData.current && ipData.city) {
    const temperature = weatherData.current.temp_c;
    const responseData = {
      client_ip: ipAddress,
      location: ipData.city,
      temperature: temperature
    };
    
    // Store the response in the cache
    cache.set(cacheKey, responseData);

    res.send({
      ...responseData,
      greeting: `Hello, ${visitorName}!, the temperature is ${temperature} degrees Celsius in ${ipData.city}`,
    });
  } else {
    res.status(500).send("Error getting weather information");
  }
}));

app.listen(3000, () => {
  console.log("Server started on port http://localhost:3000");
});
