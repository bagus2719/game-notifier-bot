const axios = require('axios');

let redditToken = null;
let tokenExpiryTime = 0;

/**
 * Fungsi untuk mendapatkan token akses dari Reddit API.
 */
async function getRedditAccessToken() {
  if (redditToken && Date.now() < tokenExpiryTime) {
    return redditToken;
  }

  console.log("Mendapatkan token akses baru dari Reddit...");

  const authUrl = 'https://www.reddit.com/api/v1/access_token';
  const authData = new URLSearchParams({
    grant_type: 'password',
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
  });

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  
  const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post(authUrl, authData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
        'User-Agent': 'GameNotifierBot/1.0 by YourUsername'
      },
    });

    const { access_token, expires_in } = response.data;
    redditToken = access_token;
    tokenExpiryTime = Date.now() + (expires_in - 60) * 1000;
    
    console.log("Token akses berhasil didapatkan.");
    return redditToken;
  } catch (error) {
    console.error("Gagal total mendapatkan token Reddit:", error.response?.data || error.message);
    throw new Error("Autentikasi Reddit gagal.");
  }
}

/**
 * Fungsi utama untuk mengambil data game dari Reddit menggunakan API resmi.
 */
module.exports = async function getSteamGames() {
  try {
    const accessToken = await getRedditAccessToken();
    
    const apiUrl = 'https://oauth.reddit.com/r/FreeGameFindings/new?limit=25';

    const { data } = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'GameNotifierBot/1.0 by YourUsername'
      }
    });

    const posts = data.data.children;
    const STEAM_URL_REGEX = /store\.steampowered\.com\/app\/(\d+)/;

    const freeGames = posts
      .map(post => post.data)
      .filter(post => 
        post.url.includes('store.steampowered.com/app/') &&
        /(100% off|free to keep|free weekend)/i.test(post.title)
      )
      .map(post => {
        const match = post.url.match(STEAM_URL_REGEX);
        if (!match) return null;

        const appId = match[1];
        const title = post.title.replace(/\[.*?\]/g, '').trim();
        const imageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

        return {
          title: title,
          url: post.url,
          clientUrl: `steam://store/${appId}`,
          image: imageUrl,
          ends: null,
          source: 'Steam',
          sourceIcon: 'https://store.akamai.steamstatic.com/public/shared/images/header/steam_logo_share.png',
          region: 'ID',
        };
      })
      .filter(game => game !== null);

    return [...new Map(freeGames.map(item => [item.url, item])).values()];

  } catch (err) {
    console.error('❌ Gagal mengambil data game dari Reddit API:', err.response?.data || err.message);
    return [];
  }
};