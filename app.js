import express from "express";
import axios from "axios";

const app = express();
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || "385f48105fdf4d99bc4113759240207";
const TIMEOUT = 5000; // Set a timeout of 5 seconds for external API requests

// Middleware to handle async errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const getPublicIp = async () => {
  try {
    const response = await axios.get("https://api.ipify.org?format=json", { timeout: TIMEOUT });
    return response.data.ip;
  } catch (error) {
    throw new Error("Failed to get public IP address");
  }
};

app.get("/api/hello", asyncHandler(async (req, res) => {
  const visitorName = req.query.visitor_name || "Guest";

  try {
    // Get public IP
    const ipAddress = await getPublicIp();

    // Make parallel API requests
    const [ipApiResponse, weatherApiResponse] = await Promise.all([
      axios.get(`https://ipapi.co/${ipAddress}/json/`, { timeout: TIMEOUT }),
      axios.get(`http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${ipAddress}`, { timeout: TIMEOUT })
    ]);

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

      // Send the final response
      res.send(responseData);
    } else {
      res.status(500).send("Error getting weather information");
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Error getting public IP address or weather information within the timeout period");
  }
}));

app.listen(3000, () => {
  console.log("Server started on port http://localhost:3000");
});
