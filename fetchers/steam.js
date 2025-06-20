const axios = require('axios');

// Regex untuk menemukan App ID Steam dari URL toko
const STEAM_URL_REGEX = /store\.steampowered\.com\/app\/(\d+)/;

module.exports = async function getSteamGames() {
  try {
    // ====================================================================
    // PERUBAHAN: Menggunakan old.reddit.com untuk menghindari blokir
    // ====================================================================
    const { data } = await axios.get('https://old.reddit.com/r/FreeGameFindings/new.json?limit=25', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });

    const posts = data.data.children;

    const freeGames = posts
      .map(post => post.data)
      // Filter postingan yang mengarah langsung ke Steam dan berisi kata kunci game gratis
      .filter(post =>
        post.url.includes('store.steampowered.com/app/') &&
        /(100% off|free to keep|free weekend)/i.test(post.title)
      )
      .map(post => {
        const match = post.url.match(STEAM_URL_REGEX);
        if (!match) return null;

        const appId = match[1];
        // Bersihkan judul dari tag seperti [Steam], [Game], dll.
        const title = post.title.replace(/\[.*?\]/g, '').trim();
        // Gunakan gambar header resmi dari Steam untuk kualitas yang lebih baik
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
    console.error('❌ Gagal mengambil data dari Steam/Reddit:', err);
    return [];
  }
};