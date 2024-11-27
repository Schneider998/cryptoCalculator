import axios from 'axios';

export async function getCryptoPrices(): Promise<{ [key: string]: number }> {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd');
    return {
      BTC: response.data.bitcoin.usd,
      ETH: response.data.ethereum.usd,
      USDT: response.data.tether.usd
    };
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return { BTC: 0, ETH: 0, USDT: 0 };
  }
}

export function calculateTotalValue(amounts: { [key: string]: number }, prices: { [key: string]: number }): number {
  return Object.entries(amounts).reduce((total, [currency, amount]) => {
    return total + (amount || 0) * (prices[currency] || 0);
  }, 0);
}

export async function getHistoricalPrices(currency: string): Promise<{ date: string; price: number }[]> {
  const id = currency === 'BTC' ? 'bitcoin' : currency === 'ETH' ? 'ethereum' : 'tether';
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=u
sd&days=30&interval=daily`);
    return response.data.prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toISOString(),
      price
    }));
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    return [];
  }
}

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string, prices: { [key: string]: number }): number {
  const fromPrice = prices[fromCurrency] || 1;
  const toPrice = prices[toCurrency] || 1;
  return (amount * fromPrice) / toPrice;
}

