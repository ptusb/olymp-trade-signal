import React, { useEffect, useState } from 'react';
import './index.css';

function App() {
  const [signal, setSignal] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const [liveTimestamp, setLiveTimestamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [liveSignal, setLiveSignal] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [signalRes, priceRes] = await Promise.all([
          fetch('https://olymp-trade-signal.onrender.com/signals'),
          fetch('https://olymp-trade-signal.onrender.com/live-price?pair=EURUSD')
        ]);
        const signalData = await signalRes.json();
        const priceJson = await priceRes.json();
        console.log('Fetched signal data:');
        console.dir(signalData, { depth: null });
        console.log('Fetched price data:');
        console.dir(priceJson, { depth: null });
        setSignal(signalData);
        setPriceData(priceJson);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    const ws = new WebSocket('wss://ws.live-rates.com');

    ws.onopen = () => {
      console.log('Connected to Live-Rates WebSocket');
      ws.send(JSON.stringify({
        type: 'subscribe',
        pairs: ['EURUSD']
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.pair === 'EURUSD') {
        console.log('Live price update:', data);
        setLivePrice(data.bid);
        setLiveTimestamp(data.timestamp);

        setPriceHistory(prev => {
          const updated = [...prev.slice(-4), data.bid]; // last 4 + new = 5
          // Simple strategy: compare current price to average of last 5
          const avg = updated.reduce((a, b) => a + b, 0) / updated.length;
          if (data.bid > avg * 1.0005) {
            setLiveSignal('CALL');
          } else if (data.bid < avg * 0.9995) {
            setLiveSignal('PUT');
          } else {
            setLiveSignal('HOLD');
          }
          return updated;
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl mb-6 text-funkyYellow drop-shadow-lg">Olymp Trade AI Signals</h1>

      {loading ? (
        <p className="text-lg">Loading data...</p>
      ) : (
        <>
          {liveSignal ? (
            <div className="bg-funkyGreen bg-opacity-20 backdrop-blur-md border-2 border-funkyGreen rounded-3xl p-8 max-w-md w-full shadow-2xl mb-6">
              <h2 className="text-2xl mb-4 text-funkyPink">Live Signal (WebSocket)</h2>
              <p className="mb-2 text-lg">Signal: <span className="font-bold text-funkyBlue">{liveSignal}</span></p>
            </div>
          ) : signal && !signal.error ? (
            <div className="bg-funkyGreen bg-opacity-20 backdrop-blur-md border-2 border-funkyGreen rounded-3xl p-8 max-w-md w-full shadow-2xl mb-6">
              <h2 className="text-2xl mb-4 text-funkyPink">{signal.pair}</h2>
              <p className="mb-2 text-lg">Signal: <span className="font-bold text-funkyBlue">{signal.signal}</span></p>
              <p className="mb-4">Confidence: <span className="font-bold text-funkyYellow">{signal.confidence ? (signal.confidence * 100).toFixed(2) : 'N/A'}%</span></p>
              <button
                className="bg-funkyPink hover:bg-funkyPurple text-white mr-2"
                onClick={() => window.location.reload()}
              >
                Refresh Signal
              </button>
              <button
                className="bg-funkyBlue hover:bg-funkyPurple text-white mt-4"
                onClick={() => {
                  setExplaining(true);
                  setExplanation('');
                  // Simulate AI explanation generation
                  setTimeout(() => {
                    setExplanation('This is a simulated AI explanation of the trading signal. Once AI integration is available, this will provide insights about the signal, market conditions, and strategy rationale.');
                    setExplaining(false);
                  }, 1500);
                }}
              >
                Explain this Signal (AI)
              </button>
              {explaining && <p className="mt-4 text-funkyYellow">Generating explanation...</p>}
              {explanation && <p className="mt-4 text-white">{explanation}</p>}
            </div>
          ) : (
            <p className="text-lg text-red-400">Failed to load signal.</p>
          )}

          {livePrice ? (
            <div className="bg-funkyBlue bg-opacity-20 backdrop-blur-md border-2 border-funkyBlue rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-xl mb-2 text-funkyYellow">Live Price (WebSocket): EUR/USD</h2>
              <p className="text-lg mb-2">Price: <span className="font-bold">{parseFloat(livePrice).toFixed(5)}</span></p>
              <p className="text-sm">Last Updated: {liveTimestamp}</p>
            </div>
          ) : priceData && !priceData.error && priceData.price ? (
            <div className="bg-funkyBlue bg-opacity-20 backdrop-blur-md border-2 border-funkyBlue rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-xl mb-2 text-funkyYellow">Live Price (API): {priceData.pair}</h2>
              <p className="text-lg mb-2">Price: <span className="font-bold">{parseFloat(priceData.price).toFixed(5)}</span></p>
              <p className="text-sm">Last Updated: {priceData.timestamp}</p>
            </div>
          ) : (
            <p className="text-lg text-red-400">Failed to load live price.</p>
          )}

          <div className="mt-8 w-full max-w-2xl flex justify-center">
            <div className="w-full h-[400px] rounded-3xl overflow-hidden shadow-2xl">
              <iframe
                src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_12345&symbol=FX:EURUSD&interval=1&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc/UTC&withdateranges=1&hideideas=1&hidelegend=0&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=FX:EURUSD"
                style={{ width: '100%', height: '100%' }}
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </>
      )}

      <p className="mt-6 text-sm text-gray-300 max-w-md text-center">
        Disclaimer: Trading involves risk. Signals are for informational purposes only and do not guarantee profits.
      </p>
    </div>
  );
}

export default App;
