const countries = [
    { name: "Turkey", code: "tr", color: "#6e8b61" },
    { name: "Canada", code: "ca", color: "#b66e6c" },
    { name: "Mexico", code: "mx", color: "#6e8b61" },
    { name: "Colombia", code: "co", color: "#6e8b61" },
    { name: "Venezuela", code: "ve", color: "#6e8b61" },
    { name: "Australia", code: "au", color: "#b66e6c" },
    { name: "Siam", code: "th", color: "#a59262" },
    { name: "Brazil", code: "br", color: "#6e8b61" },
    { name: "Netherlands", code: "nl", color: "#5479a4" },
    { name: "France", code: "fr", color: "#5479a4" },
    { name: "Argentina", code: "ar", color: "#6e8b61" },
    { name: "Spain", code: "es", color: "#a0a0a0" },
    { name: "Belgium", code: "be", color: "#5479a4" },
    { name: "Norway", code: "no", color: "#5479a4" },
    { name: "Sweden", code: "se", color: "#a0a0a0" },
    { name: "Finland", code: "fi", color: "#3e424b" },
    { name: "Manchukuo", code: "cn", color: "#a59262" }, // Fallback to CN flag
    { name: "Poland", code: "pl", color: "#b56e85" },
    { name: "Czechoslovakia", code: "cz", color: "#5479a4" },
    { name: "Hungary", code: "hu", color: "#3e424b" },
    { name: "Austria", code: "at", color: "#3e424b" },
    { name: "Bulgaria", code: "bg", color: "#3e424b" },
    { name: "Romania", code: "ro", color: "#3e424b" },
    { name: "Yugoslavia", code: "rs", color: "#6e8b61" },
    { name: "Switzerland", code: "ch", color: "#a0a0a0" },
    { name: "Greece", code: "gr", color: "#5479a4" },
    { name: "Portugal", code: "pt", color: "#a0a0a0" },
    { name: "British Raj", code: "in", color: "#b66e6c" },
    { name: "Germany (Communist)", code: "de", color: "#8b3837" },
    { name: "Germany (Monarchy)", code: "de", color: "#3e424b" },
    { name: "UK (Monarchy)", code: "gb", color: "#b66e6c" },
    { name: "UK (Fascist)", code: "gb", color: "#3e424b" },
    { name: "USA (Fascist)", code: "us", color: "#3e424b" },
    { name: "Russia (White)", code: "ru", color: "#3e424b" },
    { name: "Italy (Rome)", code: "it", color: "#6e8b61" },
    { name: "Germany (Democratic)", code: "de", color: "#5479a4" },
    { name: "Baltics", code: "ee", color: "#a0a0a0" }, // Proxy
    { name: "Peru", code: "pe", color: "#6e8b61" },
    { name: "China (Major)", code: "cn", color: "#be9e49" },
    { name: "China (Minor)", code: "cn", color: "#be9e49" },
    { name: "Iran", code: "ir", color: "#a0a0a0" },
    { name: "Japan (Any)", code: "jp", color: "#a59262" },
    { name: "South Africa", code: "za", color: "#b66e6c" }
];

// Helper to get flag URL
// You can add a 'customImage' property to any country object above to override the flag
function getFlagUrl(country) {
    if (country.customImage) return country.customImage;
    if (country.code) return `https://flagcdn.com/w320/${country.code}.png`;
    return null;
}
