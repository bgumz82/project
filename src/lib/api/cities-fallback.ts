
// Mapeamento de fallback para cidades por UF quando a tabela cities não existir
export const CITIES_FALLBACK: { [key: string]: { [city: string]: string } } = {
  "MG": {
    "JOAO PINHEIRO": "3135308",
    "BELO HORIZONTE": "3106200",
    "UBERLANDIA": "3170206",
    "CONTAGEM": "3118601",
    "BETIM": "3106705"
  },
  "SP": {
    "SAO PAULO": "3550308",
    "GUARULHOS": "3518800",
    "CAMPINAS": "3509502",
    "SAO BERNARDO DO CAMPO": "3548708",
    "SANTO ANDRE": "3547809"
  },
  "RJ": {
    "RIO DE JANEIRO": "3304557",
    "SAO GONCALO": "3304904",
    "DUQUE DE CAXIAS": "3301702",
    "NOVA IGUACU": "3303500",
    "NITEROI": "3303302"
  },
  "RS": {
    "PORTO ALEGRE": "4314902",
    "CAXIAS DO SUL": "4305108",
    "PELOTAS": "4314407",
    "CANOAS": "4304606",
    "SANTA MARIA": "4316907"
  }
}

export function getCityCodeFromFallback(cityName: string, uf: string): string | null {
  const normalizedCity = cityName.toUpperCase().trim()
  const cities = CITIES_FALLBACK[uf.toUpperCase()]
  
  if (!cities) {
    return null
  }

  // Busca exata
  if (cities[normalizedCity]) {
    return cities[normalizedCity]
  }

  // Busca parcial
  for (const [city, code] of Object.entries(cities)) {
    if (city.includes(normalizedCity) || normalizedCity.includes(city)) {
      return code
    }
  }

  return null
}
