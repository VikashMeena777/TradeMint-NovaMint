"""
Technical Indicators Engine — computes 20+ indicators using the `ta` library.
All indicators used by the Technical Analyst agent for signal generation.
"""

import pandas as pd
import numpy as np
from ta.trend import SMAIndicator, EMAIndicator, ADXIndicator, MACD
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.volatility import BollingerBands, AverageTrueRange
from ta.volume import VolumeWeightedAveragePrice
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def compute_indicators(df: pd.DataFrame) -> dict:
    """
    Compute all technical indicators from OHLCV data.
    Returns a flat dict of indicator values (latest candle).
    """
    if df is None or len(df) < 50:
        logger.warning("Insufficient data for indicator computation (need 50+ candles)")
        return {}

    try:
        close = df["Close"]
        high = df["High"]
        low = df["Low"]
        volume = df["Volume"]
        latest = df.iloc[-1]

        result = {
            "current_price": round(float(latest["Close"]), 2),
            "open": round(float(latest["Open"]), 2),
            "high": round(float(latest["High"]), 2),
            "low": round(float(latest["Low"]), 2),
            "volume": int(latest["Volume"]),
        }

        # ─── Moving Averages ────────────────────────────
        result["sma_20"] = _latest_val(SMAIndicator(close, window=20).sma_indicator())
        result["sma_50"] = _latest_val(SMAIndicator(close, window=50).sma_indicator())
        sma_200_series = SMAIndicator(close, window=200).sma_indicator() if len(df) >= 200 else None
        result["sma_200"] = _latest_val(sma_200_series)
        result["ema_9"] = _latest_val(EMAIndicator(close, window=9).ema_indicator())
        result["ema_21"] = _latest_val(EMAIndicator(close, window=21).ema_indicator())

        # Golden/Death cross
        if result["sma_50"] and result["sma_200"]:
            result["golden_cross"] = result["sma_50"] > result["sma_200"]

        # ─── RSI ────────────────────────────────────────
        result["rsi_14"] = _latest_val(RSIIndicator(close, window=14).rsi())

        # ─── MACD ───────────────────────────────────────
        macd = MACD(close)
        result["macd_line"] = _latest_val(macd.macd())
        result["macd_signal"] = _latest_val(macd.macd_signal())
        result["macd_histogram"] = _latest_val(macd.macd_diff())

        # ─── Bollinger Bands ────────────────────────────
        bb = BollingerBands(close, window=20, window_dev=2)
        result["bb_upper"] = _latest_val(bb.bollinger_hband())
        result["bb_middle"] = _latest_val(bb.bollinger_mavg())
        result["bb_lower"] = _latest_val(bb.bollinger_lband())

        # ─── ADX (Trend Strength) ──────────────────────
        adx = ADXIndicator(high, low, close, window=14)
        result["adx_14"] = _latest_val(adx.adx())
        result["plus_di"] = _latest_val(adx.adx_pos())
        result["minus_di"] = _latest_val(adx.adx_neg())

        # ─── ATR (Volatility) ──────────────────────────
        result["atr_14"] = _latest_val(AverageTrueRange(high, low, close, window=14).average_true_range())

        # ─── Stochastic ────────────────────────────────
        stoch = StochasticOscillator(high, low, close)
        result["stoch_k"] = _latest_val(stoch.stoch())
        result["stoch_d"] = _latest_val(stoch.stoch_signal())

        # ─── VWAP ──────────────────────────────────────
        try:
            vwap = VolumeWeightedAveragePrice(high, low, close, volume)
            result["vwap"] = _latest_val(vwap.volume_weighted_average_price())
        except Exception:
            result["vwap"] = None

        # ─── Volume Analysis ───────────────────────────
        vol_sma = SMAIndicator(volume.astype(float), window=20).sma_indicator()
        result["volume_sma_20"] = _latest_val(vol_sma)
        if result["volume_sma_20"] and result["volume_sma_20"] > 0:
            result["volume_ratio"] = round(float(latest["Volume"]) / result["volume_sma_20"], 2)

        # ─── Pivot Points (Classic) ────────────────────
        prev = df.iloc[-2]
        pp = (float(prev["High"]) + float(prev["Low"]) + float(prev["Close"])) / 3
        result["pivot_point"] = round(pp, 2)
        result["r1"] = round(2 * pp - float(prev["Low"]), 2)
        result["s1"] = round(2 * pp - float(prev["High"]), 2)
        result["r2"] = round(pp + (float(prev["High"]) - float(prev["Low"])), 2)
        result["s2"] = round(pp - (float(prev["High"]) - float(prev["Low"])), 2)

        # ─── Supertrend (manual — not in ta lib) ──────
        result.update(_compute_supertrend(df, period=10, multiplier=3))

        # ─── Signal Summary ────────────────────────────
        result["trend"] = _determine_trend(result)
        result["momentum"] = _determine_momentum(result)
        result["volatility"] = _determine_volatility(result)

        return result

    except Exception as e:
        logger.error(f"Indicator computation error: {e}")
        return {}


def _latest_val(series: Optional[pd.Series]) -> Optional[float]:
    """Get the latest non-NaN value from a series."""
    if series is None or series.empty:
        return None
    clean = series.dropna()
    if clean.empty:
        return None
    return round(float(clean.iloc[-1]), 2)


def _compute_supertrend(df: pd.DataFrame, period: int = 10, multiplier: float = 3) -> dict:
    """Manual Supertrend implementation."""
    try:
        high = df["High"].values
        low = df["Low"].values
        close = df["Close"].values
        n = len(df)

        atr_vals = np.zeros(n)
        tr = np.maximum(high - low, np.maximum(np.abs(high - np.roll(close, 1)), np.abs(low - np.roll(close, 1))))
        tr[0] = high[0] - low[0]

        # Simple ATR
        for i in range(period, n):
            atr_vals[i] = np.mean(tr[i - period + 1:i + 1])

        upper = (high + low) / 2 + multiplier * atr_vals
        lower = (high + low) / 2 - multiplier * atr_vals

        supertrend = np.zeros(n)
        direction = np.ones(n)  # 1 = bullish, -1 = bearish

        for i in range(1, n):
            if close[i] > upper[i - 1]:
                direction[i] = 1
            elif close[i] < lower[i - 1]:
                direction[i] = -1
            else:
                direction[i] = direction[i - 1]

            supertrend[i] = lower[i] if direction[i] == 1 else upper[i]

        return {
            "supertrend": round(float(supertrend[-1]), 2),
            "supertrend_direction": "bullish" if direction[-1] == 1 else "bearish",
        }
    except Exception:
        return {"supertrend": None, "supertrend_direction": None}


def _determine_trend(ind: dict) -> str:
    """Determine overall trend from indicators."""
    signals = []
    if ind.get("sma_50") and ind.get("sma_200"):
        signals.append("bullish" if ind["sma_50"] > ind["sma_200"] else "bearish")
    if ind.get("current_price") and ind.get("ema_21"):
        signals.append("bullish" if ind["current_price"] > ind["ema_21"] else "bearish")
    if ind.get("adx_14") and ind["adx_14"] < 20:
        return "sideways"
    bullish = signals.count("bullish")
    return "bullish" if bullish > len(signals) / 2 else "bearish" if bullish < len(signals) / 2 else "sideways"


def _determine_momentum(ind: dict) -> str:
    """Determine momentum from RSI and MACD."""
    rsi = ind.get("rsi_14")
    macd_hist = ind.get("macd_histogram")
    if rsi and rsi > 60 and macd_hist and macd_hist > 0:
        return "positive"
    if rsi and rsi < 40 and macd_hist and macd_hist < 0:
        return "negative"
    return "neutral"


def _determine_volatility(ind: dict) -> str:
    """Determine volatility regime from ATR and Bollinger Bands."""
    atr = ind.get("atr_14")
    price = ind.get("current_price")
    if atr and price and price > 0:
        atr_pct = (atr / price) * 100
        if atr_pct > 3:
            return "high"
        if atr_pct < 1:
            return "low"
    return "normal"
