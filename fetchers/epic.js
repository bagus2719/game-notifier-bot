const axios = require("axios");

module.exports = async function getEpicGames() {
  try {
    const { data } = await axios.get(
      "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=id-ID&country=ID&allowCountries=ID"
    );

    const games = data.data.Catalog.searchStore.elements;

    return games
      .filter(game => game.promotions?.promotionalOffers?.length > 0)
      .map(game => {
        const offer = game.promotions.promotionalOffers[0].promotionalOffers[0];
        const ends = offer.endDate.split("T")[0];

        const slug = game.productSlug || game.customAttributes?.find(
          (attr) => attr.key === "com.epicgames.app.productSlug"
        )?.value;

        if (!slug) {
          return null;
        }
        
        const url = `https://store.epicgames.com/id/p/${slug}`;
        const clientUrl = `com.epicgames.launcher://store/p/${slug}`;

        return {
          title: game.title,
          url: url,
          clientUrl: clientUrl,
          image:
            game.keyImages.find((img) => img.type === "DieselStoreFrontWide")?.url || "",
          ends: ends,
          source: "Epic Games",
          sourceIcon:
            "https://cdn2.unrealengine.com/Fortnite%2Fblog%2Fegstore2022%2Fegstore2022-1920x1080-1920x1080-44cb79fd6ed6.jpg",
          region: "ID",
        };
      })
      .filter(game => game !== null);
  } catch (err) {
    console.error("❌ Gagal mengambil data dari Epic Games:", err.message);
    return [];
  }
};