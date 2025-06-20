const axios = require('axios');

// Regex untuk menemukan App ID Steam dari URL toko
const STEAM_URL_REGEX = /store\.steampowered\.com\/app\/(\d+)/;

module.exports = async function getSteamGames() {
  try {
    // Ambil 25 postingan terbaru dari r/FreeGameFindings
    const { data } = await axios.get('https://www.reddit.com/r/FreeGameFindings/new.json?limit=25', {
      // ====================================================================
      // TAMBAHAN: Menambahkan header User-Agent agar tidak diblokir Reddit
      // ====================================================================
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });

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
          clientUrl: `steam://store/${appId}`, // Tautan untuk membuka langsung di klien Steam
          image: imageUrl,
          ends: null, // Tanggal akhir tidak tersedia dari sumber Reddit
          source: 'Steam',
          sourceIcon: 'https://store.akamai.steamstatic.com/public/shared/images/header/steam_logo_share.png',
          region: 'ID', // Anggap postingan relevan secara global
        };
      })
      .filter(game => game !== null); // Hapus entri yang tidak cocok dengan regex URL

    // Hapus game duplikat (berdasarkan URL) untuk menghindari repost
    return [...new Map(freeGames.map(item => [item.url, item])).values()];

  } catch (err) {
    console.error('❌ Gagal mengambil data dari Steam/Reddit:', err);
    return [];
  }
};