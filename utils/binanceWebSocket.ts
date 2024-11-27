type PriceUpdateCallback = (symbol: string, price: number) => void;
type ConnectionCallback = () => void;
type ErrorCallback = (error: string) => void;

export function connectToBinanceWebSocket(
  symbols: string[],
  onPriceUpdate: PriceUpdateCallback,
  onConnected: ConnectionCallback,
  onError: ErrorCallback
) {
  const ws = new WebSocket('wss://stream.binance.com:9443/ws');

  ws.onopen = () => {
    console.log('Connected to Binance WebSocket');
    const subscribeMsg = {
      method: 'SUBSCRIBE',
      params: symbols.map(symbol => `${symbol.toLowerCase()}@trade`),
      id: 1
    };
    ws.send(JSON.stringify(subscribeMsg));
    onConnected();
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.e === 'trade') {
      const symbol = data.s;
      const price = parseFloat(data.p);
      onPriceUpdate(symbol, price);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    onError('WebSocket connection error');
  };

  ws.onclose = () => {
    console.log('Disconnected from Binance WebSocket');
    onError('WebSocket connection closed');
  };

  return () => {
    ws.close();
  };
}

