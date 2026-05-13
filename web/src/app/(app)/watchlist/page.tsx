"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMarketData } from "@/hooks/use-market-data";
import { formatINR, formatPercent } from "@/lib/constants";
import { StockChart } from "@/components/charts/stock-chart";
import {
  Plus, Search, Star, TrendingUp, TrendingDown,
  Trash2, Eye, X, Loader2, BarChart3
} from "lucide-react";
import Link from "next/link";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

interface WatchlistItem {
  symbol: string;
  exchange: string;
  addedAt: string;
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "RELIANCE", exchange: "NSE", addedAt: new Date().toISOString() },
  { symbol: "TCS", exchange: "NSE", addedAt: new Date().toISOString() },
  { symbol: "HDFCBANK", exchange: "NSE", addedAt: new Date().toISOString() },
  { symbol: "INFY", exchange: "NSE", addedAt: new Date().toISOString() },
  { symbol: "ICICIBANK", exchange: "NSE", addedAt: new Date().toISOString() },
];

const POPULAR_STOCKS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "HINDUNILVR", "ITC", "BAJFINANCE", "BHARTIARTL", "SBIN",
  "LT", "KOTAKBANK", "AXISBANK", "WIPRO", "TATAMOTORS",
  "ADANIENT", "SUNPHARMA", "MARUTI", "TITAN", "ASIANPAINT",
];

function WatchlistRow({ item, onRemove, onSelect, isSelected }: {
  item: WatchlistItem;
  onRemove: (symbol: string) => void;
  onSelect: (symbol: string) => void;
  isSelected: boolean;
}) {
  const { data, loading } = useMarketData(item.symbol, item.exchange);
  const isUp = data ? data.change_pct >= 0 : true;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`glass-card p-4 flex items-center justify-between cursor-pointer transition-all ${
        isSelected ? "border-purple-500/50 bg-purple-500/5" : "glass-card-hover"
      }`}
      onClick={() => onSelect(item.symbol)}
    >
      <div className="flex items-center gap-3">
        <Star className={`h-4 w-4 ${isSelected ? "text-purple-400 fill-purple-400" : "text-amber-400 fill-amber-400"}`} />
        <div>
          <div className="font-semibold">{item.symbol}</div>
          <div className="text-xs text-muted-foreground">{item.exchange}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : data ? (
          <>
            <div className="text-right">
              <div className="font-mono font-semibold tabular-nums">{formatINR(data.current_price)}</div>
              <div className={`text-xs font-mono ${isUp ? "text-green-400" : "text-red-400"}`}>
                {isUp ? "+" : ""}{formatPercent(data.change_pct)}
              </div>
            </div>
            {isUp ? <TrendingUp className="h-4 w-4 text-green-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Offline</span>
        )}

        <div className="flex gap-1">
          <Link href={`/signals?symbol=${item.symbol}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-400 hover:text-purple-300" title="Generate Signal">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:text-red-300"
            onClick={(e) => { e.stopPropagation(); onRemove(item.symbol); }}
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("trademind_watchlist");
    if (stored) {
      setWatchlist(JSON.parse(stored));
    } else {
      setWatchlist(DEFAULT_WATCHLIST);
      localStorage.setItem("trademind_watchlist", JSON.stringify(DEFAULT_WATCHLIST));
    }
  }, []);

  const saveWatchlist = (items: WatchlistItem[]) => {
    setWatchlist(items);
    localStorage.setItem("trademind_watchlist", JSON.stringify(items));
  };

  const addSymbol = (symbol: string) => {
    if (watchlist.some(w => w.symbol === symbol)) return;
    const newItem: WatchlistItem = { symbol, exchange: "NSE", addedAt: new Date().toISOString() };
    saveWatchlist([...watchlist, newItem]);
    setShowAdd(false);
    setSearch("");
  };

  const removeSymbol = (symbol: string) => {
    saveWatchlist(watchlist.filter(w => w.symbol !== symbol));
    if (selectedSymbol === symbol) setSelectedSymbol(null);
  };

  const filteredStocks = POPULAR_STOCKS.filter(
    s => s.toLowerCase().includes(search.toLowerCase()) && !watchlist.some(w => w.symbol === s)
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="text-sm text-muted-foreground">{watchlist.length} stocks tracked · Live prices</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-purple-600 hover:bg-purple-700">
          {showAdd ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showAdd ? "Cancel" : "Add Stock"}
        </Button>
      </motion.div>

      {/* Add Stock Panel */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 overflow-hidden"
          >
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stocks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-muted border-border"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {filteredStocks.slice(0, 15).map(stock => (
                <Button
                  key={stock}
                  variant="outline"
                  size="sm"
                  onClick={() => addSymbol(stock)}
                  className="border-border hover:border-purple-500/50 hover:bg-purple-500/10 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" /> {stock}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Watchlist Column */}
        <div className="lg:col-span-2 space-y-2">
          <AnimatePresence>
            {watchlist.map(item => (
              <WatchlistRow
                key={item.symbol}
                item={item}
                onRemove={removeSymbol}
                onSelect={setSelectedSymbol}
                isSelected={selectedSymbol === item.symbol}
              />
            ))}
          </AnimatePresence>

          {watchlist.length === 0 && (
            <div className="glass-card p-8 text-center">
              <Star className="h-10 w-10 text-amber-400/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No stocks in your watchlist</p>
              <Button onClick={() => setShowAdd(true)} variant="ghost" size="sm" className="mt-2 text-purple-400">
                <Plus className="mr-1 h-3 w-3" /> Add your first stock
              </Button>
            </div>
          )}
        </div>

        {/* Chart Column */}
        <div className="lg:col-span-3">
          {selectedSymbol ? (
            <motion.div
              key={selectedSymbol}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-400" />
                  {selectedSymbol} — 6 Month Chart
                </h3>
                <Link href={`/signals?symbol=${selectedSymbol}`}>
                  <Button size="sm" variant="outline" className="text-xs border-purple-500/30 text-purple-400">
                    Generate Signal
                  </Button>
                </Link>
              </div>
              <StockChart symbol={selectedSymbol} height={380} />
            </motion.div>
          ) : (
            <div className="glass-card p-12 text-center">
              <BarChart3 className="h-12 w-12 text-purple-400/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Select a stock to view its chart</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
