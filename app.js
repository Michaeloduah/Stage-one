import express from "express";
import { publicIp } from "public-ip";
import axios from "axios";
import NodeCache from "node-cache";

const app = express();
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || "385f48105fdf4d99bc4113759240207";
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes
const TIMEOUT = 4500; // Set a timeout of 4.5 seconds to ensure response within 5 seconds

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

  try {
    const ipAddress = await publicIp({ timeout: TIMEOUT });

    // Make parallel API requests using axios with a timeout
    const [ipApiResponse, weatherApiResponse] = await Promise.all([
      axios.get(`https://ipapi.co/${ipAddress}/json/`, { timeout: TIMEOUT }),
      axios.get(`http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${ipAddress}`, { timeout: TIMEOUT })
    ]);

    const ipData = ipApiResponse.data;
    const weatherData = weatherApiResponse.data;

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
  } catch (error) {
    res.status(500).send("Error getting public IP address or weather information within the timeout period");
  }
}));

app.listen(3000, () => {
  console.log("Server started on port http://localhost:3000");
});
