// ==UserScript==
// @name         Olymp Trade Auto Trading Bot
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto trading bot for Olymp Trade with price prediction and modern UI
// @author       AIAssistant
// @match        https://*.olymptrade.com/*
// @grant        GM_addStyle
// @run-at       document-start
// @noframes
// ==/UserScript==

// Main bot code
(function() {
    'use strict';

    // Add a very visible initialization message
    console.log('%cOlymp Trade Bot Initialized!', 'color: #4CAF50; font-size: 20px; font-weight: bold;');
    console.log('%cBot is now running. Check console for detailed logs.', 'color: #2196F3; font-size: 14px;');

    // Override WebSocket constructor
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        console.log('%c🔌 WebSocket Connection Attempt', 'color: #FF9800; font-size: 16px; font-weight: bold;', {
            url: url,
            protocols: protocols,
            timestamp: new Date().toISOString()
        });
        
        try {
            const socket = new originalWebSocket(url, protocols);
            
            // Store original event handlers
            const originalOnOpen = socket.onopen;
            const originalOnMessage = socket.onmessage;
            const originalOnError = socket.onerror;
            const originalOnClose = socket.onclose;
            const originalSend = socket.send;

            // Override event handlers
            socket.onopen = function(event) {
                console.log('%c✅ WebSocket Connected', 'color: #4CAF50; font-size: 16px; font-weight: bold;', {
                    url: url,
                    timestamp: new Date().toISOString()
                });
                if (originalOnOpen) originalOnOpen.call(this, event);
            };

            socket.onmessage = function(event) {
                try {
                    console.log('%c📥 WebSocket Message Received', 'color: #FF9800; font-size: 16px; font-weight: bold;', {
                        url: url,
                        timestamp: new Date().toISOString(),
                        data: event.data
                    });
                    if (window.processWebSocketData) {
                        window.processWebSocketData(event.data, url);
                    }
                } catch (e) {
                    console.error('%c❌ Error processing message:', 'color: #F44336; font-size: 16px; font-weight: bold;', {
                        error: e,
                        url: url,
                        timestamp: new Date().toISOString()
                    });
                }
                if (originalOnMessage) originalOnMessage.call(this, event);
            };

            socket.onerror = function(error) {
                console.error('%c❌ WebSocket Error', 'color: #F44336; font-size: 16px; font-weight: bold;', {
                    url: url,
                    error: error,
                    timestamp: new Date().toISOString()
                });
                if (originalOnError) originalOnError.call(this, error);
            };

            socket.onclose = function(event) {
                console.log('%c🔌 WebSocket Closed', 'color: #FF9800; font-size: 16px; font-weight: bold;', {
                    url: url,
                    code: event.code,
                    reason: event.reason,
                    timestamp: new Date().toISOString()
                });
                if (originalOnClose) originalOnClose.call(this, event);
            };

            socket.send = function(data) {
                try {
                    console.log('%c📤 WebSocket Sending', 'color: #FF9800; font-size: 16px; font-weight: bold;', {
                        url: url,
                        data: data,
                        timestamp: new Date().toISOString()
                    });
                } catch (e) {
                    console.error('%c❌ Error logging send data:', 'color: #F44336; font-size: 16px; font-weight: bold;', {
                        error: e,
                        url: url,
                        timestamp: new Date().toISOString()
                    });
                }
                return originalSend.apply(this, arguments);
            };

            if (window.botState) {
                window.botState.websockets.push(socket);
            }
            console.log('%c✅ WebSocket Tracking Started', 'color: #4CAF50; font-size: 16px; font-weight: bold;', {
                url: url,
                timestamp: new Date().toISOString()
            });

            return socket;
        } catch (e) {
            console.error('%c❌ Error creating WebSocket:', 'color: #F44336; font-size: 16px; font-weight: bold;', {
                error: e,
                url: url,
                timestamp: new Date().toISOString()
            });
            return new originalWebSocket(url, protocols);
        }
    };

    // Configuration variables
    let config = {
        enabled: false,
        investmentAmount: 10,
        maxLoss: 100,
        tradeFrequency: 5,
        predictionThreshold: 70,
        riskLevel: 'medium',
        selectedAsset: ''
    };

    // Bot state
    window.botState = {
        isTrading: false,
        totalProfit: 0,
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        lastTradeTime: null,
        priceHistory: [],
        websockets: [],
        currentPrice: null,
        currentPrediction: {
            direction: null,
            confidence: 0,
            reason: ""
        }
    };

    // Create custom styles for the bot UI
    function addCustomStyles() {
        console.log('%cOlymp Trade Bot: Adding custom styles', 'color: #FF9800');
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            #trading-bot-container {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                background: rgba(32, 34, 37, 0.95);
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                z-index: 9999;
                font-family: Arial, sans-serif;
                color: #f0f0f0;
                transition: all 0.3s ease;
                max-height: 90vh;
                overflow-y: auto;
            }

            #trading-bot-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 15px;
                background: rgba(42, 44, 47, 0.95);
                border-radius: 8px 8px 0 0;
                cursor: move;
            }

            #trading-bot-header h2 {
                margin: 0;
                font-size: 16px;
                font-weight: bold;
            }

            #bot-controls {
                padding: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .control-group {
                margin-bottom: 12px;
            }

            .control-group label {
                display: block;
                margin-bottom: 5px;
                font-size: 12px;
                color: #ccc;
            }

            .control-group select, .control-group input {
                width: 100%;
                padding: 8px 10px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.2);
                color: #fff;
                font-size: 14px;
            }

            .toggle-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 15px;
            }

            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 50px;
                height: 24px;
            }

            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 24px;
            }

            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 4px;
                bottom: 4px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }

            input:checked + .toggle-slider {
                background-color: #2196F3;
            }

            input:checked + .toggle-slider:before {
                transform: translateX(26px);
            }

            #bot-status {
                padding: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .status-line {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .status-value {
                font-weight: bold;
            }

            #prediction-indicator {
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 15px 0;
                padding: 10px;
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.2);
            }

            .indicator-up, .indicator-down, .indicator-neutral {
                padding: 6px 10px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 14px;
                margin-right: 10px;
            }

            .indicator-up {
                background-color: rgba(46, 204, 113, 0.2);
                color: #2ecc71;
            }

            .indicator-down {
                background-color: rgba(231, 76, 60, 0.2);
                color: #e74c3c;
            }

            .indicator-neutral {
                background-color: rgba(241, 196, 15, 0.2);
                color: #f1c40f;
            }

            .confidence-bar {
                height: 6px;
                width: 100%;
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                margin-top: 5px;
            }

            .confidence-level {
                height: 100%;
                border-radius: 3px;
                background-color: #3498db;
            }

            #trade-log {
                padding: 15px;
                max-height: 200px;
                overflow-y: auto;
            }

            .log-header {
                font-size: 14px;
                margin-bottom: 10px;
            }

            .log-entry {
                padding: 8px;
                margin-bottom: 5px;
                font-size: 12px;
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.2);
            }

            .log-time {
                color: #bbb;
                font-size: 10px;
                margin-top: 3px;
            }

            .minimize-btn {
                background: none;
                border: none;
                color: #ccc;
                cursor: pointer;
                font-size: 16px;
            }

            .price-chart {
                padding: 15px;
                height: 150px;
                background: rgba(0, 0, 0, 0.2);
                margin: 15px;
                border-radius: 4px;
                position: relative;
                display: flex;
                align-items: flex-end;
            }

            .price-bar {
                flex: 1;
                margin: 0 1px;
                min-width: 3px;
                background: linear-gradient(to bottom, #3498db, #2980b9);
                transition: height 0.3s ease;
            }

            .win-trade {
                color: #2ecc71;
            }

            .loss-trade {
                color: #e74c3c;
            }

            .minimized {
                width: 50px;
                height: 50px;
                overflow: hidden;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .minimized #trading-bot-header h2,
            .minimized #bot-controls,
            .minimized #bot-status,
            .minimized #trade-log {
                display: none;
            }

            .minimized #trading-bot-header {
                padding: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: 50%;
            }

            .minimized .minimize-btn {
                transform: rotate(45deg);
            }
        `;
        document.head.appendChild(styleElement);
        console.log('%cOlymp Trade Bot: Custom styles added successfully', 'color: #4CAF50');
    }

    // Initialize bot after page load
    function initializeBot() {
        console.log('%cOlymp Trade Bot: Starting initialization', 'color: #2196F3');
        
        // Check if we're on the correct page
        if (!document.querySelector('.page-platform')) {
            console.error('%cOlymp Trade Bot: Not on the trading platform page', 'color: #F44336');
            return;
        }

        // Wait for the page container to be ready
        const checkContainer = setInterval(() => {
            const container = document.getElementById('page-container');
            if (container) {
                clearInterval(checkContainer);
                console.log('%cOlymp Trade Bot: Page container found', 'color: #4CAF50');
                
                // Add custom styles
                addCustomStyles();
                
                // Initialize bot UI
                initBot();
                
                console.log('%cOlymp Trade Bot: Initialization complete', 'color: #4CAF50');
            }
        }, 100);

        // Set a timeout in case the container never appears
        setTimeout(() => {
            clearInterval(checkContainer);
            console.error('%cOlymp Trade Bot: Page container not found after timeout', 'color: #F44336');
        }, 10000);
    }

    // Start initialization when the page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeBot);
    } else {
        initializeBot();
    }

    // Process WebSocket data
    window.processWebSocketData = function(data, url) {
        try {
            console.log('%cOlymp Trade Bot: Processing WebSocket Data', 'color: #2196F3');
            const jsonData = JSON.parse(data);
            console.log('%cOlymp Trade Bot: Parsed Data:', 'color: #2196F3', jsonData);

            if (jsonData.d && Array.isArray(jsonData.d)) {
                console.log('%cOlymp Trade Bot: Processing Price Updates', 'color: #4CAF50');
                const priceUpdates = {};
                
                jsonData.d.forEach(update => {
                    if (update.p && update.q) {
                        priceUpdates[update.p] = {
                            ticker: update.p,
                            price: update.q,
                            timestamp: update.t
                        };
                        console.log('%cOlymp Trade Bot: Price Update:', 'color: #4CAF50', {
                            pair: update.p,
                            price: update.q,
                            timestamp: new Date(update.t * 1000).toISOString()
                        });
                    }
                });

                if (Object.keys(priceUpdates).length > 0) {
                    processPriceData(priceUpdates);
                }
            }
        } catch (e) {
            console.error('%cOlymp Trade Bot: Error Processing Data:', 'color: #F44336', e);
        }
    };

    // Process price data from WebSocket
    function processPriceData(assets) {
        try {
            console.log('Olymp Trade Bot: Processing price data:', assets);
            const assetsList = document.getElementById('asset-selector');

            if (!assetsList) {
                console.warn('Olymp Trade Bot: Asset selector not found');
                return;
            }

            // Update asset list if needed
            if (assetsList.children.length <= 1) {
                console.log('Olymp Trade Bot: Updating assets list');
                const assetKeys = Object.keys(assets);
                if (assetKeys.length > 0) {
                    console.log('Olymp Trade Bot: Available assets:', assetKeys);
                    updateAssetsList(assetKeys);
                } else {
                    console.warn('Olymp Trade Bot: No assets found in price data');
                }
            }

            // Get the selected asset
            const selectedAsset = config.selectedAsset || (assetsList.value !== 'none' ? assetsList.value : null);

            if (!selectedAsset) {
                console.warn('Olymp Trade Bot: No asset selected');
                return;
            }

            if (!assets[selectedAsset]) {
                console.warn('Olymp Trade Bot: Selected asset not found in price data:', selectedAsset);
                console.log('Olymp Trade Bot: Available assets:', Object.keys(assets));
                return;
            }

            // Update current price
            const assetData = assets[selectedAsset];
            if (typeof assetData.price !== 'number') {
                console.error('Olymp Trade Bot: Invalid price value:', assetData.price);
                return;
            }

            botState.currentPrice = assetData.price;
            console.log('Olymp Trade Bot: Current price updated:', {
                asset: selectedAsset,
                price: botState.currentPrice,
                timestamp: assetData.timestamp ? new Date(assetData.timestamp * 1000).toISOString() : 'N/A'
            });

            // Update price history
            botState.priceHistory.push({
                price: botState.currentPrice,
                timestamp: assetData.timestamp || Date.now()
            });

            // Keep only the last 100 price points
            if (botState.priceHistory.length > 100) {
                botState.priceHistory.shift();
            }

            // Update UI with new price data
            updatePriceDisplay(botState.currentPrice);
            updatePriceChart(botState.priceHistory);

            // Make prediction based on price history
            if (botState.priceHistory.length >= 30) { // Need enough data points
                console.log('Olymp Trade Bot: Making price prediction');
                botState.currentPrediction = predictPriceMovement(botState.priceHistory);
                console.log('Olymp Trade Bot: Prediction result:', botState.currentPrediction);
                updatePredictionDisplay(botState.currentPrediction);

                // Check if we should auto-trade
                checkAutoTrading();
            }
        } catch (e) {
            console.error('Olymp Trade Bot: Error processing price data:', e);
            console.error('Olymp Trade Bot: Price data that caused error:', assets);
        }
    }

    // Update the assets list in the UI
    function updateAssetsList(assets) {
        const assetsList = document.getElementById('asset-selector');
        if (!assetsList) return;

        // Clear current options except first placeholder
        while (assetsList.children.length > 1) {
            assetsList.removeChild(assetsList.lastChild);
        }

        // Add new options
        assets.forEach(asset => {
            const option = document.createElement('option');
            option.value = asset;
            option.textContent = asset;
            assetsList.appendChild(option);
        });
    }

    // Price prediction logic
    function predictPriceMovement(priceHistory) {
        // We'll use a combination of simple technical indicators for prediction

        // Extract just the prices for easier calculations
        const prices = priceHistory.map(entry => entry.price);

        // Calculate short and long moving averages
        const shortMA = calculateSMA(prices, 5);
        const longMA = calculateSMA(prices, 15);

        // Calculate RSI
        const rsi = calculateRSI(prices, 14);

        // Calculate recent price change percentage
        const recentChangePercent = ((prices[prices.length - 1] - prices[prices.length - 10]) / prices[prices.length - 10]) * 100;

        // Determine prediction based on indicators
        let direction = null;
        let confidence = 0;
        let reason = '';

        // Short MA crossing above Long MA is bullish
        if (shortMA > longMA) {
            direction = 'up';
            confidence += 25;
            reason += 'Short-term MA above long-term MA. ';
        } else if (shortMA < longMA) {
            direction = 'down';
            confidence += 25;
            reason += 'Short-term MA below long-term MA. ';
        }

        // RSI indicates overbought/oversold conditions
        if (rsi > 70) {
            // Overbought - likely to go down
            if (direction === 'down') {
                confidence += 20;
                reason += 'RSI indicates overbought conditions. ';
            } else {
                direction = 'down';
                confidence = 20;
                reason = 'RSI indicates overbought conditions. ';
            }
        } else if (rsi < 30) {
            // Oversold - likely to go up
            if (direction === 'up') {
                confidence += 20;
                reason += 'RSI indicates oversold conditions. ';
            } else {
                direction = 'up';
                confidence = 20;
                reason = 'RSI indicates oversold conditions. ';
            }
        }

        // Recent momentum
        if (recentChangePercent > 0.5) {
            // Strong recent uptrend
            if (direction === 'up') {
                confidence += 15;
                reason += 'Strong upward momentum. ';
            } else if (!direction) {
                direction = 'up';
                confidence = 15;
                reason = 'Strong upward momentum. ';
            }
        } else if (recentChangePercent < -0.5) {
            // Strong recent downtrend
            if (direction === 'down') {
                confidence += 15;
                reason += 'Strong downward momentum. ';
            } else if (!direction) {
                direction = 'down';
                confidence = 15;
                reason = 'Strong downward momentum. ';
            }
        }

        // Price pattern detection (very basic)
        const lastFive = prices.slice(-5);
        let consistentUp = true;
        let consistentDown = true;

        for (let i = 1; i < lastFive.length; i++) {
            if (lastFive[i] <= lastFive[i-1]) consistentUp = false;
            if (lastFive[i] >= lastFive[i-1]) consistentDown = false;
        }

        if (consistentUp) {
            if (direction === 'up') {
                confidence += 15;
                reason += 'Consistent upward price pattern. ';
            } else {
                direction = 'up';
                confidence = 15;
                reason = 'Consistent upward price pattern. ';
            }
        } else if (consistentDown) {
            if (direction === 'down') {
                confidence += 15;
                reason += 'Consistent downward price pattern. ';
            } else {
                direction = 'down';
                confidence = 15;
                reason = 'Consistent downward price pattern. ';
            }
        }

        // Cap confidence at 100%
        confidence = Math.min(confidence, 100);

        // Default to neutral if no clear direction
        if (!direction || confidence < 20) {
            direction = 'neutral';
            reason = 'No clear trend detected. ';
            confidence = 0;
        }

        return {
            direction,
            confidence,
            reason: reason.trim()
        };
    }

    // Calculate Simple Moving Average
    function calculateSMA(prices, period) {
        if (prices.length < period) return null;

        const slice = prices.slice(-period);
        const sum = slice.reduce((total, price) => total + price, 0);
        return sum / period;
    }

    // Calculate Relative Strength Index
    function calculateRSI(prices, period) {
        if (prices.length < period + 1) return 50;

        let gains = 0;
        let losses = 0;

        for (let i = prices.length - period; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            if (change >= 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }

        if (losses === 0) return 100;

        const relativeStrength = gains / losses;
        return 100 - (100 / (1 + relativeStrength));
    }

    // Check if we should execute a trade based on config and current prediction
    function checkAutoTrading() {
        console.log('Olymp Trade Bot: Checking auto trading conditions');
        if (!config.enabled || !botState.currentPrice || !botState.currentPrediction) {
            console.log('Olymp Trade Bot: Auto trading conditions not met');
            return;
        }

        // Check if we've waited long enough since last trade
        const now = Date.now();
        if (botState.lastTradeTime && now - botState.lastTradeTime < config.tradeFrequency * 60 * 1000) {
            console.log('Olymp Trade Bot: Waiting for trade cooldown');
            return;
        }

        // Check if prediction confidence meets threshold
        if (botState.currentPrediction.direction !== 'neutral' &&
            botState.currentPrediction.confidence >= config.predictionThreshold) {
            console.log('Olymp Trade Bot: Executing trade based on prediction');
            // Execute trade
            executeTrade(botState.currentPrediction.direction, config.investmentAmount);
        } else {
            console.log('Olymp Trade Bot: Prediction confidence below threshold or neutral direction');
        }
    }

    // Execute a trade on Olymp Trade
    function executeTrade(direction, amount) {
        console.log('Olymp Trade Bot: Executing trade', { direction, amount });
        // Set trading state
        botState.isTrading = true;
        botState.lastTradeTime = Date.now();

        // Log the trade
        logMessage(`Executing ${direction.toUpperCase()} trade for $${amount}`, 'trade');

        // Simulate trade execution (in a real scenario, you'd interact with the DOM elements)
        setTimeout(() => {
            try {
                console.log('Olymp Trade Bot: Looking for trading buttons');
                // Find trading buttons (this is where you'd need to adapt to the specific platform's DOM)
                const buyButton = document.querySelector('[data-role="button-call"], [data-test="deal-button-call"]');
                const sellButton = document.querySelector('[data-role="button-put"], [data-test="deal-button-put"]');

                // Set the amount (find the input field and set its value)
                const amountInput = document.querySelector('[data-role="input-amount"], [data-test="amount-input"]');
                if (amountInput) {
                    console.log('Olymp Trade Bot: Setting trade amount');
                    // Use direct value setting and dispatch events to trigger any listeners
                    amountInput.value = amount;
                    amountInput.dispatchEvent(new Event('input', { bubbles: true }));
                    amountInput.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Click the appropriate button
                if (direction === 'up' && buyButton) {
                    console.log('Olymp Trade Bot: Clicking buy button');
                    buyButton.click();
                    simulateTradeResult(direction);
                } else if (direction === 'down' && sellButton) {
                    console.log('Olymp Trade Bot: Clicking sell button');
                    sellButton.click();
                    simulateTradeResult(direction);
                } else {
                    console.error('Olymp Trade Bot: Trading buttons not found');
                    logMessage(`Failed to execute trade: Trading buttons not found`, 'error');
                    botState.isTrading = false;
                }
            } catch (error) {
                console.error('Olymp Trade Bot: Error executing trade:', error);
                logMessage(`Error executing trade: ${error.message}`, 'error');
                botState.isTrading = false;
            }
        }, 1000); // Small delay to simulate processing
    }

    // Simulate trade result (only for demonstration purposes)
    function simulateTradeResult(direction) {
        console.log('Olymp Trade Bot: Simulating trade result');
        // In a real scenario, you would monitor the trade result
        // Here we'll just simulate a win/loss based on the confidence level

        setTimeout(() => {
            const confidence = botState.currentPrediction.confidence;
            const randomFactor = Math.random() * 100;

            // The higher the confidence, the more likely to win
            const win = randomFactor < confidence;
            console.log('Olymp Trade Bot: Trade result:', { win, confidence, randomFactor });

            if (win) {
                const profit = config.investmentAmount * 0.8; // Assuming 80% payout
                botState.totalProfit += profit;
                botState.winTrades++;
                console.log('Olymp Trade Bot: Trade won! Profit:', profit);
                logMessage(`Trade WON! Profit: $${profit.toFixed(2)}`, 'win');
            } else {
                botState.totalProfit -= config.investmentAmount;
                botState.lossTrades++;
                console.log('Olymp Trade Bot: Trade lost! Loss:', config.investmentAmount);
                logMessage(`Trade LOST! Loss: $${config.investmentAmount.toFixed(2)}`, 'loss');

                // Check if max loss reached
                if (isMaxLossReached()) {
                    console.log('Olymp Trade Bot: Maximum loss limit reached');
                    config.enabled = false;
                    document.getElementById('bot-toggle').checked = false;
                    logMessage(`Maximum loss limit reached. Trading stopped.`, 'alert');
                }
            }

            botState.totalTrades++;
            botState.isTrading = false;

            // Update UI
            updateBotStatus();
        }, 10000); // Simulate a 10-second trade
    }

    // Check if maximum loss has been reached
    function isMaxLossReached() {
        if (!config.maxLoss) return false;
        return botState.totalProfit <= -config.maxLoss;
    }

    // Initialize the bot UI and functionality
    function initBot() {
        console.log('%cOlymp Trade Bot: Initializing bot UI and functionality', 'color: #2196F3');
        
        // Create bot UI container
        const botContainer = document.createElement('div');
        botContainer.id = 'trading-bot-container';
        document.body.appendChild(botContainer);
        console.log('%cOlymp Trade Bot: Bot container created', 'color: #4CAF50');

        // Add content to container
        botContainer.innerHTML = `
            <div id="trading-bot-header">
                <h2>Olymp Trade Auto Trading Bot</h2>
                <button class="minimize-btn">×</button>
            </div>

            <div id="bot-controls">
                <div class="control-group">
                    <label for="asset-selector">Select Asset:</label>
                    <select id="asset-selector">
                        <option value="none">Select an asset...</option>
                    </select>
                </div>

                <div class="control-group">
                    <label for="investment-amount">Investment Amount ($):</label>
                    <input type="number" id="investment-amount" min="1" value="10">
                </div>

                <div class="control-group">
                    <label for="max-loss">Maximum Loss Limit ($):</label>
                    <input type="number" id="max-loss" min="0" value="100">
                </div>

                <div class="control-group">
                    <label for="prediction-threshold">Prediction Threshold (%):</label>
                    <input type="number" id="prediction-threshold" min="0" max="100" value="70">
                </div>

                <div class="control-group">
                    <label for="trade-frequency">Minutes Between Trades:</label>
                    <input type="number" id="trade-frequency" min="1" value="5">
                </div>

                <div class="control-group">
                    <label for="risk-level">Risk Level:</label>
                    <select id="risk-level">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>

                <div class="toggle-container">
                    <span>Auto Trading:</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="bot-toggle">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div id="bot-status">
                <div class="status-line">
                    <span>Current Price:</span>
                    <span class="status-value" id="current-price">-</span>
                </div>

                <div class="status-line">
                    <span>Total Profit/Loss:</span>
                    <span class="status-value" id="total-profit">$0.00</span>
                </div>

                <div class="status-line">
                    <span>Win/Loss Ratio:</span>
                    <span class="status-value" id="win-loss-ratio">0/0 (0%)</span>
                </div>

                <div id="prediction-indicator">
                    <div class="indicator-neutral">NEUTRAL</div>
                    <div>
                        <div>Confidence: <span id="confidence-value">0%</span></div>
                        <div class="confidence-bar">
                            <div class="confidence-level" style="width: 0%"></div>
                        </div>
                    </div>
                </div>

                <div class="price-chart" id="price-chart">
                    <!-- Price bars will be added here dynamically -->
                </div>
            </div>

            <div id="trade-log">
                <div class="log-header">Trade Log</div>
                <div id="log-container">
                    <!-- Log entries will be added here -->
                </div>
            </div>
        `;
        console.log('%cOlymp Trade Bot: Bot UI elements created', 'color: #4CAF50');

        // Make bot draggable
        makeDraggable(botContainer);
        console.log('%cOlymp Trade Bot: Bot made draggable', 'color: #4CAF50');

        // Set up event listeners for controls
        document.getElementById('bot-toggle').addEventListener('change', function() {
            config.enabled = this.checked;
            console.log('%cOlymp Trade Bot: Auto trading', 'color: #2196F3', config.enabled ? 'enabled' : 'disabled');
            logMessage(`Auto trading ${config.enabled ? 'enabled' : 'disabled'}`, 'system');
        });

        document.getElementById('asset-selector').addEventListener('change', function() {
            config.selectedAsset = this.value;
            if (this.value !== 'none') {
                console.log('%cOlymp Trade Bot: Selected asset:', 'color: #2196F3', config.selectedAsset);
                logMessage(`Selected asset: ${config.selectedAsset}`, 'system');
            }
        });

        document.getElementById('investment-amount').addEventListener('change', function() {
            config.investmentAmount = parseFloat(this.value);
            console.log('%cOlymp Trade Bot: Investment amount set to:', 'color: #2196F3', config.investmentAmount);
            logMessage(`Investment amount set to $${config.investmentAmount}`, 'system');
        });

        document.getElementById('max-loss').addEventListener('change', function() {
            config.maxLoss = parseFloat(this.value);
            console.log('%cOlymp Trade Bot: Maximum loss limit set to:', 'color: #2196F3', config.maxLoss);
            logMessage(`Maximum loss limit set to $${config.maxLoss}`, 'system');
        });

        document.getElementById('prediction-threshold').addEventListener('change', function() {
            config.predictionThreshold = parseInt(this.value);
            console.log('%cOlymp Trade Bot: Prediction threshold set to:', 'color: #2196F3', config.predictionThreshold);
            logMessage(`Prediction threshold set to ${config.predictionThreshold}%`, 'system');
        });

        document.getElementById('trade-frequency').addEventListener('change', function() {
            config.tradeFrequency = parseInt(this.value);
            console.log('%cOlymp Trade Bot: Trade frequency set to:', 'color: #2196F3', config.tradeFrequency);
            logMessage(`Trade frequency set to ${config.tradeFrequency} minutes`, 'system');
        });

        document.getElementById('risk-level').addEventListener('change', function() {
            config.riskLevel = this.value;
            console.log('%cOlymp Trade Bot: Risk level set to:', 'color: #2196F3', config.riskLevel);
            logMessage(`Risk level set to ${config.riskLevel}`, 'system');
        });

        // Set up minimize button
        document.querySelector('.minimize-btn').addEventListener('click', function() {
            botContainer.classList.toggle('minimized');
            if (botContainer.classList.contains('minimized')) {
                this.textContent = '+';
            } else {
                this.textContent = '×';
            }
            console.log('%cOlymp Trade Bot: Bot UI', 'color: #2196F3', botContainer.classList.contains('minimized') ? 'minimized' : 'maximized');
        });

        // Log initialization
        console.log('%cOlymp Trade Bot: Bot initialized successfully', 'color: #4CAF50');
        logMessage('Bot initialized. Ready to trade.', 'system');
    }

    // Make an element draggable
    function makeDraggable(element) {
        const header = element.querySelector('#trading-bot-header');

        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        header.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();

            // Get mouse position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();

            // Calculate new position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            // Set element's new position
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // Stop moving when mouse button is released
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // Update price display
    function updatePriceDisplay(price) {
        const priceElement = document.getElementById('current-price');
        if (priceElement && price) {
            priceElement.textContent = price.toFixed(5);
        }
    }

    // Update prediction display
    function updatePredictionDisplay(prediction) {
        if (!prediction) return;

        const indicator = document.getElementById('prediction-indicator');
        const confidenceValue = document.getElementById('confidence-value');
        const confidenceBar = document.querySelector('.confidence-level');

        // Find or create indicator element
        let indicatorElement = indicator.querySelector('div:first-child');
        if (!indicatorElement) {
            indicatorElement = document.createElement('div');
            indicator.prepend(indicatorElement);
        }

        // Remove previous indicator classes
        indicatorElement.classList.remove('indicator-up', 'indicator-down', 'indicator-neutral');

        // Update indicator based on prediction
        if (prediction.direction === 'up') {
            indicatorElement.textContent = 'UP';
            indicatorElement.classList.add('indicator-up');
        } else if (prediction.direction === 'down') {
            indicatorElement.textContent = 'DOWN';
            indicatorElement.classList.add('indicator-down');
        } else {
            indicatorElement.textContent = 'NEUTRAL';
            indicatorElement.classList.add('indicator-neutral');
        }

        // Update confidence display
        if (confidenceValue) {
            confidenceValue.textContent = `${prediction.confidence}%`;
        }

        if (confidenceBar) {
            confidenceBar.style.width = `${prediction.confidence}%`;

            // Set color based on direction
            if (prediction.direction === 'up') {
                confidenceBar.style.backgroundColor = '#2ecc71';
            } else if (prediction.direction === 'down') {
                confidenceBar.style.backgroundColor = '#e74c3c';
            } else {
                confidenceBar.style.backgroundColor = '#f1c40f';
            }
        }
    }

    // Update price chart
    function updatePriceChart(priceHistory) {
        const chartElement = document.getElementById('price-chart');
        if (!chartElement || priceHistory.length === 0) return;

        // Clear existing bars
        chartElement.innerHTML = '';

        // Determine min and max for scaling
        const prices = priceHistory.map(entry => entry.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice;

        // Create bars for each price point
        priceHistory.forEach((entry, index) => {
            // Skip some entries if we have too many (show about 30 bars)
            if (priceHistory.length > 30 && index % Math.ceil(priceHistory.length / 30) !== 0) {
                return;
            }

            const bar = document.createElement('div');
            bar.className = 'price-bar';

            // Calculate height percentage based on min/max
            let heightPercentage = 10; // Minimum height

            if (range > 0) {
                heightPercentage = ((entry.price - minPrice) / range) * 90 + 10;
            }

            bar.style.height = `${heightPercentage}%`;

            // Add tooltip with actual price
            bar.title = `${entry.price.toFixed(5)} - ${new Date(entry.timestamp).toLocaleTimeString()}`;

            chartElement.appendChild(bar);
        });
    }

    // Update bot status display
    function updateBotStatus() {
        const profitElement = document.getElementById('total-profit');
        const ratioElement = document.getElementById('win-loss-ratio');

        if (profitElement) {
            const profitText = `$${botState.totalProfit.toFixed(2)}`;
            profitElement.textContent = profitText;

            // Set color based on profit/loss
            if (botState.totalProfit > 0) {
                profitElement.style.color = '#2ecc71';
            } else if (botState.totalProfit < 0) {
                profitElement.style.color = '#e74c3c';
            } else {
                profitElement.style.color = '#f0f0f0';
            }
        }

        if (ratioElement) {
            const winRate = botState.totalTrades > 0 ?
                ((botState.winTrades / botState.totalTrades) * 100).toFixed(1) : 0;

            ratioElement.textContent = `${botState.winTrades}/${botState.lossTrades} (${winRate}%)`;
        }
    }

    // Log a message to the trade log
    function logMessage(message, type = 'info') {
        const logContainer = document.getElementById('log-container');
        if (!logContainer) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}-log`;

        // Create message content
        const messageContent = document.createElement('div');
        messageContent.textContent = message;

        if (type === 'win') {
            messageContent.classList.add('win-trade');
        } else if (type === 'loss') {
            messageContent.classList.add('loss-trade');
        }

        // Create timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'log-time';
        timestamp.textContent = new Date().toLocaleTimeString();

        // Add elements to log entry
        logEntry.appendChild(messageContent);
        logEntry.appendChild(timestamp);

        // Add to log container
        logContainer.prepend(logEntry);

        // Limit log size
        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }

    // Helper function to check if market conditions are suitable for trading
    function isMarketConditionSuitable() {
        // Check for extreme market conditions based on price volatility
        if (botState.priceHistory.length < 20) return true;

        // Calculate recent volatility
        const recentPrices = botState.priceHistory.slice(-20).map(entry => entry.price);

        let volatility = 0;
        for (let i = 1; i < recentPrices.length; i++) {
            const percentChange = Math.abs((recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1] * 100);
            volatility += percentChange;
        }

        volatility = volatility / (recentPrices.length - 1);

        // Check if volatility is too high based on risk level
        const volatilityThresholds = {
            low: 0.05,
            medium: 0.1,
            high: 0.2
        };

        return volatility <= volatilityThresholds[config.riskLevel];
    }

    // Function to handle errors and unexpected situations
    function handleError(error, context) {
        console.error(`Error in ${context}: `, error);
        logMessage(`Error: ${error.message} (in ${context})`, 'error');

        // If a critical error, disable auto trading
        if (context === 'trade execution' || context === 'price prediction') {
            config.enabled = false;
            const botToggle = document.getElementById('bot-toggle');
            if (botToggle) botToggle.checked = false;

            logMessage('Auto trading disabled due to critical error', 'alert');
        }
    }

    // Run startup message
    console.log("Olymp Trade Auto Trading Bot loaded. Version 1.0");

    // Safety disclaimer in console
    console.warn(`
        DISCLAIMER: This auto trading bot is for educational purposes only.
        Using automated trading scripts may violate Olymp Trade's terms of service.
        Trading financial instruments involves significant risk of loss.
        The creator of this script is not responsible for any financial losses incurred.
        Use at your own risk.
    `);
})();
