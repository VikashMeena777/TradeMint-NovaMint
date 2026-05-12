"""
Market Data Fetcher — Free sources for Indian stock data.
Primary: yfinance (Yahoo Finance) — free, no API key needed
Future: Angel One SmartAPI / Upstox API for real-time data
"""

import yfinance as yf
import pandas as pd
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Yahoo Finance uses .NS suffix for NSE, .BO for BSE
EXCHANGE_SUFFIX = {"NSE": ".NS", "BSE": ".BO"}


def get_stock_data(
    symbol: str,
    exchange: str = "NSE",
    period: str = "6mo",
    interval: str = "1d",
) -> Optional[pd.DataFrame]:
    """
    Fetch historical OHLCV data for an Indian stock.
    Uses Yahoo Finance (free, no API key).
    """
    # Index tickers (^NSEI, ^BSESN, etc.) don't need exchange suffix
    if symbol.startswith("^"):
        ticker = symbol
    else:
        suffix = EXCHANGE_SUFFIX.get(exchange.upper(), ".NS")
        ticker = f"{symbol}{suffix}"

    try:
        logger.info(f"Fetching data for {ticker} (period={period}, interval={interval})")
        stock = yf.Ticker(ticker)
        data = stock.history(period=period, interval=interval)

        if data.empty:
            logger.warning(f"No data returned for {ticker}")
            return None

        # Clean column names
        data.columns = [col if isinstance(col, str) else col[0] for col in data.columns]
        data = data[["Open", "High", "Low", "Close", "Volume"]].copy()
        data.dropna(inplace=True)

        logger.info(f"Got {len(data)} candles for {ticker}")
        return data

    except Exception as e:
        logger.error(f"Failed to fetch data for {ticker}: {e}")
        return None


def get_stock_info(symbol: str, exchange: str = "NSE") -> dict:
    """Get fundamental info for a stock (sector, market cap, P/E, etc.)."""
    if symbol.startswith("^"):
        ticker = symbol
    else:
        suffix = EXCHANGE_SUFFIX.get(exchange.upper(), ".NS")
        ticker = f"{symbol}{suffix}"

    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}
        return {
            "symbol": symbol,
            "name": info.get("longName", symbol),
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE", 0),
            "pb_ratio": info.get("priceToBook", 0),
            "dividend_yield": info.get("dividendYield", 0),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh", 0),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow", 0),
            "avg_volume": info.get("averageVolume", 0),
            "current_price": info.get("currentPrice", info.get("regularMarketPrice", 0)),
        }
    except Exception as e:
        logger.error(f"Failed to get info for {ticker}: {e}")
        return {"symbol": symbol, "name": symbol, "sector": "Unknown"}


def get_index_data(index: str = "^NSEI", period: str = "1mo") -> Optional[pd.DataFrame]:
    """Fetch index data (NIFTY 50 = ^NSEI, SENSEX = ^BSESN)."""
    try:
        data = yf.Ticker(index).history(period=period)
        if data.empty:
            return None
        data.columns = [col if isinstance(col, str) else col[0] for col in data.columns]
        return data[["Open", "High", "Low", "Close", "Volume"]]
    except Exception as e:
        logger.error(f"Failed to fetch index {index}: {e}")
        return None
