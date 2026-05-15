"""
Market Data Fetcher — Angel One (live real-time) → Yahoo Finance (fallback).
Angel One SmartAPI provides real-time LTP and historical candles for NSE/BSE.
Yahoo Finance is used as fallback when Angel One is not configured.
"""

import yfinance as yf
import pandas as pd
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Yahoo Finance uses .NS suffix for NSE, .BO for BSE
EXCHANGE_SUFFIX = {"NSE": ".NS", "BSE": ".BO"}


def _get_angel_one_data(
    symbol: str, exchange: str, period: str, interval: str
) -> Optional[pd.DataFrame]:
    """Try fetching from Angel One first."""
    try:
        from angel_one import is_configured, get_historical_data, SYMBOL_TOKEN_MAP

        if not is_configured():
            return None

        # Map period to days
        period_days = {
            "1mo": 30, "3mo": 90, "6mo": 180,
            "1y": 365, "2y": 730, "5d": 5, "1d": 1,
        }
        days = period_days.get(period, 180)

        # Map interval to Angel One format
        interval_map = {
            "1d": "ONE_DAY", "1h": "ONE_HOUR",
            "15m": "FIFTEEN_MINUTE", "5m": "FIVE_MINUTE",
            "1m": "ONE_MINUTE", "30m": "THIRTY_MINUTE",
        }
        ao_interval = interval_map.get(interval, "ONE_DAY")

        # Check if symbol is in the token map
        if symbol.upper() not in SYMBOL_TOKEN_MAP:
            return None

        candles = get_historical_data(
            symbol=symbol, exchange=exchange,
            interval=ao_interval, days=days,
        )

        if not candles:
            return None

        # Convert to DataFrame matching Yahoo Finance format
        df = pd.DataFrame(candles)
        df.index = pd.to_datetime(df["time"])
        df.rename(columns={
            "open": "Open", "high": "High",
            "low": "Low", "close": "Close", "volume": "Volume",
        }, inplace=True)
        df = df[["Open", "High", "Low", "Close", "Volume"]]
        df.dropna(inplace=True)

        logger.info(f"Angel One: Got {len(df)} candles for {symbol}")
        return df

    except Exception as e:
        logger.warning(f"Angel One data fetch failed for {symbol}: {e}")
        return None


def _map_to_yahoo_ticker(symbol: str, exchange: str) -> str:
    """Map common Indian symbols/indices to Yahoo Finance tickers."""
    INDEX_MAP = {
        "NIFTY": "^NSEI",
        "NIFTY50": "^NSEI",
        "BANKNIFTY": "^NSEBANK",
        "SENSEX": "^BSESN",
        "FINNIFTY": "^CNXFIN",
        "MIDCPNIFTY": "^CRSMID",
        "NIFTYIT": "^CNXIT",
    }
    
    symbol_upper = symbol.upper().replace(" ", "")
    if symbol_upper in INDEX_MAP:
        return INDEX_MAP[symbol_upper]
        
    if symbol.startswith("^"):
        return symbol
        
    suffix = EXCHANGE_SUFFIX.get(exchange.upper(), ".NS")
    return f"{symbol}{suffix}"


def get_stock_data(
    symbol: str,
    exchange: str = "NSE",
    period: str = "6mo",
    interval: str = "1d",
) -> Optional[pd.DataFrame]:
    """
    Fetch historical OHLCV data for an Indian stock.
    Priority: Angel One (real-time) → Yahoo Finance (free fallback)
    """
    # Skip Angel One for index tickers (^NSEI, etc.)
    if not symbol.startswith("^"):
        angel_data = _get_angel_one_data(symbol, exchange, period, interval)
        if angel_data is not None and not angel_data.empty:
            return angel_data

    # Fallback to Yahoo Finance
    ticker = _map_to_yahoo_ticker(symbol, exchange)

    try:
        logger.info(f"Yahoo Finance: Fetching {ticker} (period={period}, interval={interval})")
        stock = yf.Ticker(ticker)
        data = stock.history(period=period, interval=interval)

        if data.empty:
            logger.warning(f"No data returned for {ticker}")
            return None

        # Clean column names
        data.columns = [col if isinstance(col, str) else col[0] for col in data.columns]
        data = data[["Open", "High", "Low", "Close", "Volume"]].copy()
        data.dropna(inplace=True)

        logger.info(f"Yahoo Finance: Got {len(data)} candles for {ticker}")
        return data

    except Exception as e:
        logger.error(f"Failed to fetch data for {ticker}: {e}")
        return None


def get_live_price(symbol: str, exchange: str = "NSE") -> Optional[dict]:
    """
    Get live/real-time price for a symbol.
    Priority: Angel One (real-time) → Yahoo Finance (15-min delayed)
    """
    # Try Angel One first
    try:
        from angel_one import is_configured, get_ltp

        if is_configured():
            ltp = get_ltp(symbol, exchange)
            if ltp:
                return ltp
    except Exception as e:
        logger.warning(f"Angel One LTP failed: {e}")

    # Fallback to Yahoo Finance
    try:
        ticker = _map_to_yahoo_ticker(symbol, exchange)
        stock = yf.Ticker(ticker)
        data = stock.history(period="1d")

        if data.empty:
            return None

        data.columns = [col if isinstance(col, str) else col[0] for col in data.columns]
        latest = data.iloc[-1]

        return {
            "symbol": symbol,
            "exchange": exchange,
            "ltp": round(float(latest["Close"]), 2),
            "open": round(float(latest["Open"]), 2),
            "high": round(float(latest["High"]), 2),
            "low": round(float(latest["Low"]), 2),
            "close": round(float(latest["Close"]), 2),
            "volume": int(latest["Volume"]),
            "source": "yahoo_finance",
        }
    except Exception as e:
        logger.error(f"Yahoo Finance LTP failed for {symbol}: {e}")
        return None


def get_stock_info(symbol: str, exchange: str = "NSE") -> dict:
    """Get fundamental info for a stock (sector, market cap, P/E, etc.)."""
    ticker = _map_to_yahoo_ticker(symbol, exchange)

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
