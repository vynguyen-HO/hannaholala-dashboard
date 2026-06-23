const https = require("https");

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(data).toString();
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) }
    }, res => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(JSON.parse(d)));
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

function ga4Post(token, propertyId, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = https.request({
      hostname: "analyticsdata.googleapis.com",
      path: `/v1beta/properties/${propertyId}:runReport`,
      method: "POST",
      headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(b) }
    }, res => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(JSON.parse(d)));
    });
    req.on("error", reject); req.write(b); req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  try {
    const tokenRes = await httpPost("https://oauth2.googleapis.com/token", {
      client_id: process.env.GA_CLIENT_ID,
      client_secret: process.env.GA_CLIENT_SECRET,
      refresh_token: process.env.GA_REFRESH_TOKEN,
      grant_type: "refresh_token"
    });
    if (!tokenRes.access_token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Token refresh failed", detail: tokenRes }) };
    }
    const body = JSON.parse(event.body || "{}");
    const result = await ga4Post(tokenRes.access_token, process.env.GA_PROPERTY_ID || "395861131", body);
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
