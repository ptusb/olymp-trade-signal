from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI(
    title="Olymp Trade Signal API",
    description="Backend service for generating Olymp Trade signals",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Olymp Trade Signal API is running."}

signal_cache = {"data": None, "timestamp": 0}
price_cache = {"data": None, "timestamp": 0}

@app.get("/signals")
async def get_signals():
    import requests

    now = time.time()
    if signal_cache["data"] and now - signal_cache["timestamp"] < 10:
        return signal_cache["data"]

    api_key = "61418e1753391358e19701e806fb5546"
    url = f"https://api.forexrateapi.com/v1/latest?api_key={api_key}&base=USD&symbols=EUR"

    try:
        response = requests.get(url, timeout=5)
        data = response.json()
        rate = data.get("rates", {}).get("EUR")
        timestamp = data.get("date")

        if not rate:
            return {"error": "No data from ForexRateAPI"}

        # Simulated recent price history for RSI calculation
        import random
        prices = [rate * (1 + random.uniform(-0.001, 0.001)) for _ in range(14)]

        # Calculate RSI
        gains = []
        losses = []
        for i in range(1, len(prices)):
            delta = prices[i] - prices[i - 1]
            if delta > 0:
                gains.append(delta)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(-delta)

        avg_gain = sum(gains) / len(gains) if gains else 0
        avg_loss = sum(losses) / len(losses) if losses else 0

        if avg_loss == 0:
            rsi = 100
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))

        # Signal logic based on RSI
        if rsi > 70:
            signal = "PUT"
            confidence = (rsi - 70) / 30  # scale 0-1
        elif rsi < 30:
            signal = "CALL"
            confidence = (30 - rsi) / 30  # scale 0-1
        else:
            signal = "HOLD"
            confidence = (1 - abs(rsi - 50) / 20) * 0.5  # lower confidence in neutral zone

        result = {
            "pair": "EUR/USD",
            "signal": signal,
            "confidence": round(confidence, 2),
            "price": rate,
            "timestamp": timestamp,
            "rsi": round(rsi, 2)
        }
        signal_cache["data"] = result
        signal_cache["timestamp"] = now
        return result
    except Exception as e:
        return {"error": str(e)}

import requests

@app.get("/live-price")
async def live_price(pair: str = "EURUSD"):
    import requests

    now = time.time()
    if price_cache["data"] and now - price_cache["timestamp"] < 10:
        return price_cache["data"]

    api_key = "61418e1753391358e19701e806fb5546"
    url = f"https://api.forexrateapi.com/v1/latest?api_key={api_key}&base=USD&symbols=EUR"

    try:
        response = requests.get(url, timeout=5)
        data = response.json()
        rate = data.get("rates", {}).get("EUR")
        timestamp = data.get("date")

        if not rate:
            return {"error": "No data from ForexRateAPI"}

        result = {
            "pair": "EUR/USD",
            "price": rate,
            "timestamp": timestamp
        }
        price_cache["data"] = result
        price_cache["timestamp"] = now
        return result
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
