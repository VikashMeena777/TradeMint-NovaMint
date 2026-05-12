# Broker Abstraction Layer v1.0

## 1. Overview

TradeMind supports multiple Indian brokers (Zerodha, Upstox, Angel One) and needs a clean abstraction layer to:
- Prevent tight coupling to any single broker
- Enable seamless failover when a broker experiences downtime
- Make adding new brokers a plug-in operation
- Standardize order/position/margin data models across brokers

---

## 2. Abstract Broker Interface

```python
from abc import ABC, abstractmethod
from typing import AsyncIterator
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    SL = "stop_loss"
    SL_M = "stop_loss_market"

class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"

class ProductType(Enum):
    CNC = "cnc"       # Cash & Carry (delivery)
    MIS = "mis"       # Margin Intraday Settlement
    NRML = "nrml"     # Normal (F&O overnight)

class Exchange(Enum):
    NSE = "NSE"
    BSE = "BSE"
    NFO = "NFO"
    BFO = "BFO"

@dataclass
class OrderRequest:
    symbol: str
    exchange: Exchange
    side: OrderSide
    qty: int
    order_type: OrderType
    product: ProductType
    price: float | None = None
    trigger_price: float | None = None
    tag: str = ""                  # SEBI Generic Algo ID tag
    validity: str = "DAY"

@dataclass
class OrderResponse:
    order_id: str
    broker_order_id: str
    status: str
    message: str
    timestamp: datetime

@dataclass
class Position:
    symbol: str
    exchange: Exchange
    product: ProductType
    qty: int
    avg_price: float
    last_price: float
    pnl: float

@dataclass
class MarginResponse:
    available_cash: float
    available_margin: float
    used_margin: float
    span_margin: float
    exposure_margin: float

@dataclass
class Tick:
    symbol: str
    exchange: Exchange
    last_price: float
    volume: int
    bid: float
    ask: float
    timestamp: datetime


class BrokerAdapter(ABC):
    """Abstract interface for Indian stock broker integrations."""
    
    @abstractmethod
    async def authenticate(self, credentials: dict) -> bool:
        """Perform OAuth/2FA authentication."""
        ...
    
    @abstractmethod
    async def is_authenticated(self) -> bool:
        """Check if current session is valid."""
        ...
    
    @abstractmethod
    async def place_order(self, order: OrderRequest) -> OrderResponse:
        """Place an order. Must tag with SEBI Algo ID."""
        ...
    
    @abstractmethod
    async def cancel_order(self, order_id: str) -> OrderResponse:
        """Cancel a pending order."""
        ...
    
    @abstractmethod
    async def get_positions(self) -> list[Position]:
        """Get current positions."""
        ...
    
    @abstractmethod
    async def get_margins(self) -> MarginResponse:
        """Get available margins."""
        ...
    
    @abstractmethod
    async def subscribe_ticks(self, symbols: list[str]) -> AsyncIterator[Tick]:
        """Subscribe to real-time tick data via WebSocket."""
        ...
    
    @abstractmethod
    async def get_historical_data(self, symbol: str, interval: str,
                                   from_date: datetime, to_date: datetime) -> list[dict]:
        """Get historical OHLCV candle data."""
        ...
    
    @abstractmethod
    def get_broker_name(self) -> str:
        """Return broker identifier."""
        ...
```

---

## 3. Broker Router (Failover)

```python
class BrokerRouter:
    """Routes orders with automatic failover."""
    
    def __init__(self):
        self.adapters: dict[str, BrokerAdapter] = {}
        self.primary: str = "zerodha"
        self.fallback_chain: list[str] = ["upstox", "angelone"]
    
    def register(self, name: str, adapter: BrokerAdapter):
        self.adapters[name] = adapter
    
    async def get_active_broker(self, user_id: str) -> BrokerAdapter:
        primary = self.adapters.get(self.primary)
        if primary and await primary.is_authenticated():
            return primary
        
        for broker_name in self.fallback_chain:
            adapter = self.adapters.get(broker_name)
            if adapter and await adapter.is_authenticated():
                return adapter
        
        raise NoBrokerAvailableError(f"All brokers unavailable for {user_id}")
    
    async def place_order_with_failover(self, user_id: str, order: OrderRequest) -> OrderResponse:
        broker = await self.get_active_broker(user_id)
        
        if not order.tag:
            order.tag = get_generic_algo_id(user_id)
        
        try:
            return await broker.place_order(order)
        except BrokerAPIError:
            for name in self.fallback_chain:
                if name == broker.get_broker_name():
                    continue
                fallback = self.adapters.get(name)
                if fallback and await fallback.is_authenticated():
                    return await fallback.place_order(order)
            raise
```

---

## 4. Data Model Mapping

| Field | Zerodha Format | Upstox Format | TradeMind Standard |
|---|---|---|---|
| **Symbol** | `RELIANCE` | `NSE\|RELIANCE` | `RELIANCE` (symbol only) |
| **Exchange** | `"NSE"` string | `"NSE_EQ"` string | `Exchange.NSE` enum |
| **Product** | `"CNC"` / `"MIS"` | `"D"` / `"I"` | `ProductType.CNC` / `ProductType.MIS` |
| **Timestamp** | ISO string | Unix epoch | `datetime` (IST timezone) |

---

## 5. Adding a New Broker

1. Create `adapters/new_broker_adapter.py` implementing `BrokerAdapter`
2. Map the broker's API to TradeMind's standardized models
3. Register: `router.register("newbroker", NewBrokerAdapter())`
4. Add OAuth callback route: `/api/auth/callback/newbroker`
5. Test with paper trading engine before enabling live orders

**Estimated integration time per broker: 2-3 days.**
