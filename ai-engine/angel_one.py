"""
Angel One SmartAPI Integration — Live real-time market data for Indian stocks.
Handles authentication (with auto TOTP), LTP quotes, and historical candle data.
Falls back to Yahoo Finance if Angel One is not configured or session expires.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
import pyotp
from SmartApi import SmartConnect
from config import get_settings

logger = logging.getLogger(__name__)

# ─── Singleton Session ─────────────────────────────
_smart_api: Optional[SmartConnect] = None
_auth_token: Optional[str] = None
_session_expiry: Optional[datetime] = None


# ─── NSE Token Map (Top 50 stocks) ────────────────
# Angel One uses numeric token IDs, not ticker symbols
# Exchange: NSE = "NSE", BSE = "BSE"
SYMBOL_TOKEN_MAP = {
    # NIFTY 50 Index
    "NIFTY": {"token": "99926000", "exchange": "NSE"},
    "BANKNIFTY": {"token": "99926009", "exchange": "NSE"},
    "NIFTYIT": {"token": "99926013", "exchange": "NSE"},
    # Large Caps
    "RELIANCE": {"token": "2885", "exchange": "NSE"},
    "TCS": {"token": "11536", "exchange": "NSE"},
    "HDFCBANK": {"token": "1333", "exchange": "NSE"},
    "INFY": {"token": "1594", "exchange": "NSE"},
    "ICICIBANK": {"token": "4963", "exchange": "NSE"},
    "HINDUNILVR": {"token": "1394", "exchange": "NSE"},
    "ITC": {"token": "1660", "exchange": "NSE"},
    "SBIN": {"token": "3045", "exchange": "NSE"},
    "BHARTIARTL": {"token": "10604", "exchange": "NSE"},
    "BAJFINANCE": {"token": "317", "exchange": "NSE"},
    "KOTAKBANK": {"token": "1922", "exchange": "NSE"},
    "LT": {"token": "11483", "exchange": "NSE"},
    "AXISBANK": {"token": "5900", "exchange": "NSE"},
    "WIPRO": {"token": "3787", "exchange": "NSE"},
    "TATAMOTORS": {"token": "3456", "exchange": "NSE"},
    "ADANIENT": {"token": "25", "exchange": "NSE"},
    "SUNPHARMA": {"token": "3351", "exchange": "NSE"},
    "MARUTI": {"token": "10999", "exchange": "NSE"},
    "TITAN": {"token": "3506", "exchange": "NSE"},
    "ASIANPAINT": {"token": "236", "exchange": "NSE"},
    "HCLTECH": {"token": "7229", "exchange": "NSE"},
    "ULTRACEMCO": {"token": "11532", "exchange": "NSE"},
    "BAJAJFINSV": {"token": "16675", "exchange": "NSE"},
    "TECHM": {"token": "13538", "exchange": "NSE"},
    "NESTLEIND": {"token": "17963", "exchange": "NSE"},
    "TATASTEEL": {"token": "3499", "exchange": "NSE"},
    "POWERGRID": {"token": "14977", "exchange": "NSE"},
    "NTPC": {"token": "11630", "exchange": "NSE"},
    "M&M": {"token": "2031", "exchange": "NSE"},
    "JSWSTEEL": {"token": "11723", "exchange": "NSE"},
    "ONGC": {"token": "2475", "exchange": "NSE"},
    "COALINDIA": {"token": "20374", "exchange": "NSE"},
    "GRASIM": {"token": "1232", "exchange": "NSE"},
    "DIVISLAB": {"token": "10940", "exchange": "NSE"},
    "DRREDDY": {"token": "881", "exchange": "NSE"},
    "CIPLA": {"token": "694", "exchange": "NSE"},
    "EICHERMOT": {"token": "910", "exchange": "NSE"},
    "HEROMOTOCO": {"token": "1348", "exchange": "NSE"},
    "BPCL": {"token": "526", "exchange": "NSE"},
    "BRITANNIA": {"token": "547", "exchange": "NSE"},
    "APOLLOHOSP": {"token": "157", "exchange": "NSE"},
    "TATACONSUM": {"token": "3432", "exchange": "NSE"},
    "INDUSINDBK": {"token": "5258", "exchange": "NSE"},
    "HINDALCO": {"token": "1363", "exchange": "NSE"},
    "SBILIFE": {"token": "21808", "exchange": "NSE"},
    "HDFCLIFE": {"token": "467", "exchange": "NSE"},
}


def is_configured() -> bool:
    """Check if Angel One credentials are configured."""
    settings = get_settings()
    return bool(
        settings.angel_one_api_key
        and settings.angel_one_client_id
        and settings.angel_one_password
        and settings.angel_one_totp_secret
    )


def _generate_totp() -> str:
    """Generate TOTP from the secret for auto-login."""
    settings = get_settings()
    totp = pyotp.TOTP(settings.angel_one_totp_secret)
    return totp.now()


def _authenticate() -> Optional[SmartConnect]:
    """Authenticate with Angel One SmartAPI. Returns SmartConnect instance."""
    global _smart_api, _auth_token, _session_expiry

    # Reuse existing session if not expired
    if _smart_api and _session_expiry and datetime.now() < _session_expiry:
        return _smart_api

    if not is_configured():
        logger.debug("Angel One not configured — skipping")
        return None

    settings = get_settings()

    try:
        obj = SmartConnect(api_key=settings.angel_one_api_key)
        totp = _generate_totp()

        data = obj.generateSession(
            clientCode=settings.angel_one_client_id,
            password=settings.angel_one_password,
            totp=totp,
        )

        if not data or data.get("status") is False:
            logger.error(f"Angel One login failed: {data}")
            return None

        _auth_token = data["data"]["jwtToken"]
        _smart_api = obj
        # Session valid for ~6 hours, refresh at 5
        _session_expiry = datetime.now() + timedelta(hours=5)

        logger.info("Angel One authenticated successfully")
        return obj

    except Exception as e:
        logger.error(f"Angel One auth error: {e}")
        _smart_api = None
        return None


def get_ltp(symbol: str, exchange: str = "NSE") -> Optional[dict]:
    """
    Get Last Traded Price for a symbol.
    Returns: {"ltp": float, "open": float, "high": float, "low": float, "close": float, "volume": int}
    """
    obj = _authenticate()
    if not obj:
        return None

    token_info = SYMBOL_TOKEN_MAP.get(symbol.upper())
    if not token_info:
        logger.warning(f"Symbol {symbol} not in token map")
        return None

    try:
        data = obj.ltpData(
            exchange=token_info["exchange"],
            tradingsymbol=symbol.upper(),
            symboltoken=token_info["token"],
        )

        if data and data.get("status"):
            ltp_data = data["data"]
            return {
                "symbol": symbol.upper(),
                "exchange": exchange,
                "ltp": float(ltp_data.get("ltp", 0)),
                "open": float(ltp_data.get("open", 0)),
                "high": float(ltp_data.get("high", 0)),
                "low": float(ltp_data.get("low", 0)),
                "close": float(ltp_data.get("close", 0)),
                "volume": int(ltp_data.get("tradeVolume", 0)),
                "source": "angel_one",
            }
        return None

    except Exception as e:
        logger.error(f"Angel One LTP error for {symbol}: {e}")
        return None


def get_historical_data(
    symbol: str,
    exchange: str = "NSE",
    interval: str = "ONE_DAY",
    days: int = 180,
) -> Optional[list]:
    """
    Get historical candle data from Angel One.
    Intervals: ONE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE, THIRTY_MINUTE,
               ONE_HOUR, ONE_DAY
    Returns list of candles: [{"time", "open", "high", "low", "close", "volume"}]
    """
    obj = _authenticate()
    if not obj:
        return None

    token_info = SYMBOL_TOKEN_MAP.get(symbol.upper())
    if not token_info:
        logger.warning(f"Symbol {symbol} not in token map")
        return None

    try:
        to_date = datetime.now()
        from_date = to_date - timedelta(days=days)

        params = {
            "exchange": token_info["exchange"],
            "symboltoken": token_info["token"],
            "interval": interval,
            "fromdate": from_date.strftime("%Y-%m-%d 09:15"),
            "todate": to_date.strftime("%Y-%m-%d 15:30"),
        }

        data = obj.getCandleData(params)

        if data and data.get("status") and data.get("data"):
            candles = []
            for candle in data["data"]:
                candles.append({
                    "time": candle[0][:10],  # YYYY-MM-DD
                    "open": float(candle[1]),
                    "high": float(candle[2]),
                    "low": float(candle[3]),
                    "close": float(candle[4]),
                    "volume": int(candle[5]),
                })
            logger.info(f"Angel One: Got {len(candles)} candles for {symbol}")
            return candles

        return None

    except Exception as e:
        logger.error(f"Angel One historical data error for {symbol}: {e}")
        return None


def logout():
    """Logout from Angel One session."""
    global _smart_api, _auth_token, _session_expiry
    if _smart_api:
        try:
            settings = get_settings()
            _smart_api.terminateSession(settings.angel_one_client_id)
            logger.info("Angel One session terminated")
        except Exception as e:
            logger.error(f"Angel One logout error: {e}")
    _smart_api = None
    _auth_token = None
    _session_expiry = None
