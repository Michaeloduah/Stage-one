import express from "express";
import externalIp from "external-ip";
import axios from "axios";
import NodeCache from "node-cache";

const app = express();
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || "385f48105fdf4d99bc4113759240207";
const TIMEOUT = 5000; // Set a timeout of 5 seconds for external API requests
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Middleware to handle async errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get("/api/hello", asyncHandler(async (req, res) => {
  const visitorName = req.query.visitor_name || "Guest";

  console.time('Total Request Time');

  const getIpAddress = () => new Promise((resolve, reject) => {
    externalIp({ timeout: TIMEOUT })((err, ip) => {
      if (err) {
        return reject(err);
      }
      resolve(ip);
    });
  });

  try {
    // Get public IP
    console.time('Get Public IP');
    const ipAddress = await getIpAddress();
    console.timeEnd('Get Public IP');

    const cacheKey = `ip_weather_info_${ipAddress}`;

    // Check cache
    console.time('Cache Check');
    const cachedResponse = cache.get(cacheKey);
    console.timeEnd('Cache Check');

    // If cached response exists, send it
    if (cachedResponse) {
      console.timeEnd('Total Request Time');
      return res.send(cachedResponse);
    }

    // Make parallel API requests
    console.time('API Requests');
    const [ipApiResponse, weatherApiResponse] = await Promise.all([
      axios.get(`https://ipapi.co/${ipAddress}/json/`, { timeout: TIMEOUT }),
      axios.get(`http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${ipAddress}`, { timeout: TIMEOUT })
    ]);
    console.timeEnd('API Requests');

    // Process API responses
    const ipData = ipApiResponse.data;
    const weatherData = weatherApiResponse.data;

    if (weatherData.current && ipData.city) {
      const temperature = weatherData.current.temp_c;
      const location = ipData.city;

      const responseData = {
        client_ip: ipAddress,
        location: location,
        temperature: temperature,
        greeting: `Hello, ${visitorName}!, the temperature is ${temperature} degrees Celsius in ${location}`
      };

      // Store the response in the cache
      console.time('Cache Set');
      cache.set(cacheKey, responseData);
      console.timeEnd('Cache Set');

      // Send the final response
      console.timeEnd('Total Request Time');
      res.send(responseData);
    } else {
      console.timeEnd('Total Request Time');
      res.status(500).send("Error getting weather information");
    }
  } catch (error) {
    console.timeEnd('Total Request Time');
    console.error("Error:", error.message);
    res.status(500).send("Error getting public IP address or weather information within the timeout period");
  }
}));

app.listen(3000, () => {
  console.log("Server started on port http://localhost:3000");
});
