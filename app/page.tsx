'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { calculateTotalValue, getHistoricalPrices } from '../utils/crypto-calculator'
import { connectToBinanceWebSocket } from '../utils/binanceWebSocket'
import { getPortfolioHoldings, PortfolioHolding } from '../utils/airtable'
import { Bitcoin, Coins, DollarSign, Moon, Sun, TrendingDown, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

const cryptoIcons = {
  BTC: Bitcoin,
  ETH: Coins,
  USDT: DollarSign,
}

const chartColors = ['#FF5722', '#FF7043', '#FF8A65']

const HistoricalPriceChart = ({ 
  selectedCurrency, 
  setSelectedCurrency,
  historicalData, 
  darkMode 
}: {
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  historicalData: Array<{ date: string; price: number }>;
  darkMode: boolean;
}) => {
  const formatPrice = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}k`
    }
    return `$${value.toFixed(2)}`
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      const formattedDate = isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'MMM d, yyyy');
      return (
        <div className={`p-3 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
          <p className="font-medium">{formattedDate}</p>
          <p className="text-[#FF5722]">
            Price: {formatPrice(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={`${darkMode ? 'bg-black border-gray-700' : 'bg-white'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className={darkMode ? 'text-white' : 'text-gray-900'}>Historical Price Chart</span>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Cryptocurrencies</SelectLabel>
                <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                <SelectItem value="USDT">Tether (USDT)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={historicalData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={darkMode ? '#2D3748' : '#E2E8F0'} 
              />
              <XAxis 
                dataKey="date"
                tickFormatter={(dateString) => {
                  const date = new Date(dateString);
                  return isNaN(date.getTime()) ? '' : format(date, 'MMM d');
                }}
                stroke={darkMode ? '#A0AEC0' : '#4A5568'}
              />
              <YAxis 
                tickFormatter={formatPrice}
                stroke={darkMode ? '#A0AEC0' : '#4A5568'}
              />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#FF5722"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: "#FF5722" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default function CryptoCalculator() {
  const [amounts, setAmounts] = useState({ BTC: 0, ETH: 0, USDT: 0 })
  const [prices, setPrices] = useState({ BTC: 0, ETH: 0, USDT: 1 })
  const [prevPrices, setPrevPrices] = useState({ BTC: 0, ETH: 0, USDT: 0 })
  const [totalValue, setTotalValue] = useState(0)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState('BTC')
  const [historicalData, setHistoricalData] = useState<{ date: string; price: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portfolioHoldings, setPortfolioHoldings] = useState<PortfolioHolding[]>([])
  const [portfolioError, setPortfolioError] = useState<string | null>(null)

  const handlePriceUpdate = useCallback((symbol: string, price: number) => {
    setPrices(prevPrices => {
      if (symbol === 'USDTUSDT') return prevPrices; // Ignore USDT price updates
      return {
        ...prevPrices,
        [symbol.replace('USDT', '')]: price
      };
    });
  }, []);

  useEffect(() => {
    const symbols = ['BTCUSDT', 'ETHUSDT'];
    setIsLoading(true);
    setError(null);
    const disconnect = connectToBinanceWebSocket(symbols, handlePriceUpdate, 
      () => setIsLoading(false),
      (err) => {
        setError('Failed to connect to Binance WebSocket. Please refresh the page.');
        setIsLoading(false);
      }
    );

    return () => {
      disconnect();
    };
  }, [handlePriceUpdate]);

  useEffect(() => {
    const fetchPortfolioHoldings = async () => {
      try {
        const holdings = await getPortfolioHoldings();
        console.log('Fetched portfolio holdings:', holdings);
        setPortfolioHoldings(holdings);
        setPortfolioError(null);
      } catch (error) {
        console.error('Error fetching portfolio holdings:', error);
        setPortfolioError(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    };

    fetchPortfolioHoldings();
  }, []);

  useEffect(() => {
    const newTotalValue = calculateTotalValue(amounts, prices)
    setTotalValue(newTotalValue)
  }, [amounts, prices])

  useEffect(() => {
    const fetchHistoricalData = async () => {
      const data = await getHistoricalPrices(selectedCurrency)
      setHistoricalData(data.filter(item => !isNaN(new Date(item.date).getTime())))
    }
    fetchHistoricalData()
  }, [selectedCurrency])

  const handleAmountChange = (currency: string, value: string) => {
    const numValue = parseFloat(value);
    setAmounts(prev => ({ ...prev, [currency]: isNaN(numValue) ? 0 : numValue }));
  }

  const portfolioAllocation = Object.entries(amounts).map(([currency, amount]) => ({
    currency,
    value: amount * (prices[currency] || 0),
    percentage: totalValue > 0 ? ((amount * (prices[currency] || 0)) / totalValue) * 100 : 0
  }));

  const getPriceChangeIndicator = (currency: string) => {
    if (prices[currency] > prevPrices[currency]) {
      return <TrendingUp className="text-green-500 ml-2" />;
    } else if (prices[currency] < prevPrices[currency]) {
      return <TrendingDown className="text-red-500 ml-2" />;
    }
    return null;
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-gray-100'}`}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Crypto Portfolio Calculator</h1>
            <p className="text-lg mt-2">phonesales.com crypto holdings</p>
          </div>
          <div className="flex items-center">
            <Sun className="w-4 h-4 mr-2" />
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            <Moon className="w-4 h-4 ml-2" />
          </div>
        </div>
        
        <Card className={`shadow-xl rounded-3xl overflow-hidden ${darkMode ? 'bg-black' : 'bg-white'}`}>
          <CardContent className="p-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                {Object.entries(amounts).map(([currency, amount]) => {
                  const Icon = cryptoIcons[currency as keyof typeof cryptoIcons]
                  return (
                    <div key={currency} className="space-y-3 mb-6">
                      <Label className={`flex items-center text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        <Icon className={`w-6 h-6 mr-2 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
                        {currency} Amount
                      </Label>
                      <Input
                        type="number"
                        value={amount === 0 ? '' : amount}
                        onChange={(e) => handleAmountChange(currency, e.target.value)}
                        className={`w-full text-lg py-6 px-4 rounded-2xl border-2 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-200'
                        } focus:border-[#FF5722] focus:ring-[#FF5722] transition-colors`}
                        placeholder="Enter amount..."
                      />
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span className="flex items-center">
                          Current Price: ${prices[currency]?.toLocaleString() ?? '0'}
                          {getPriceChangeIndicator(currency)}
                        </span>
                        <span>Value: ${((amount || 0) * (prices[currency] || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })}
                <div className="mt-6">
                  <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>Portfolio Allocation</h3>
                  <div className="space-y-2">
                    {portfolioAllocation.map((item, index) => (
                      <div key={item.currency} className="flex items-center">
                        <div className={`w-24 text-sm font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>{item.currency}</div>
                        <div className={`flex-grow ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-4 overflow-hidden`}>
                          <div 
                            className="h-full rounded-full" 
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: chartColors[index]
                            }}
                          />
                        </div>
                        <div className={`w-16 text-right text-sm font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>{item.percentage.toFixed(2)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="space-y-6">
                  <HistoricalPriceChart 
                    selectedCurrency={selectedCurrency}
                    setSelectedCurrency={setSelectedCurrency}
                    historicalData={historicalData}
                    darkMode={darkMode}
                  />
                  <Card className={`${darkMode ? 'bg-black border-gray-700' : 'bg-white'}`}>
                    <CardHeader>
                      <CardTitle className={darkMode ? 'text-white' : 'text-gray-900'}>My Portfolio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {portfolioError ? (
                        <div className="text-red-500">
                          <p>{portfolioError}</p>
                          <p className="mt-2 text-sm">
                            Please ensure you have set up the NEXT_PUBLIC_AIRTABLE_TOKEN and NEXT_PUBLIC_AIRTABLE_BASE_ID
                            environment variables correctly in your Vercel project settings.
                          </p>
                        </div>
                      ) : portfolioHoldings.length === 0 ? (
                        <div className={darkMode ? 'text-white' : 'text-gray-900'}>Loading portfolio data...</div>
                      ) : (
                        <>
                        {portfolioHoldings.map((holding) => {
                          const Icon = cryptoIcons[holding.currency as keyof typeof cryptoIcons] || DollarSign;
                          const amount = typeof holding.amount === 'number' ? holding.amount : parseFloat(holding.amount);
                          return (
                            <div key={holding.currency} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Icon className={`w-6 h-6 mr-2 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
                                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{holding.currency}</span>
                              </div>
                              <div className={`font-mono ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {!isNaN(amount) ? amount.toFixed(2) : 'N/A'} {holding.currency}
                              </div>
                            </div>
                          );
                        })}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <motion.div
              className="mt-8 p-8 bg-gradient-to-r from-[#FF5722] to-[#FF7043] rounded-2xl text-white shadow-lg"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center">
                <h2 className="text-xl font-medium mb-2 text-white">Total Portfolio Value</h2>
                <p className="text-5xl font-bold text-white">
                  ${totalValue.toLocaleString()}
                </p>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

