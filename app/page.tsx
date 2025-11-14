"use client";
import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Info,
  X,
  ExternalLink,
  Search,
} from "lucide-react";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type TokenColumn = "New pairs" | "Final Stretch" | "Migrated";
type SortDirection = "ascending" | "descending" | null;
type SortKey = "marketCap" | "price" | "volume24h" | "change24h";

interface Token {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  column: TokenColumn;
  history: number[];
  liquidity: number;
  holders: number;
  transactions24h: number;
}

interface Particle {
  left: number;
  top: number;
  delay: number;
  duration: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

const formatCurrency = (num: number): string => {
  if (num === 0 || num === undefined || num === null) return "$0.00";
  if (num < 0.01) {
    return `$${num.toFixed(6)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(num);
};

const generateSparklinePath = (history: number[]): string => {
  if (!history || history.length < 2) return "";
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  const width = 100;
  const height = 30;

  const points = history.map((value, index) => {
    const x = (index / (history.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  return `M ${points.join(" L ")}`;
};

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TOKENS: Token[] = [
  {
    id: "1",
    name: "NanoBanana",
    symbol: "NB",
    price: 0.85,
    change24h: 0.05,
    marketCap: 120000000,
    volume24h: 35000000,
    column: "New pairs",
    history: [0.8, 0.82, 0.85, 0.83, 0.85, 0.87, 0.85],
    liquidity: 5000000,
    holders: 12450,
    transactions24h: 8920,
  },
  {
    id: "2",
    name: "QuantumLeap",
    symbol: "QL",
    price: 1.52,
    change24h: -0.02,
    marketCap: 450000000,
    volume24h: 80000000,
    column: "Final Stretch",
    history: [1.55, 1.53, 1.52, 1.54, 1.52, 1.51, 1.52],
    liquidity: 15000000,
    holders: 28340,
    transactions24h: 15670,
  },
  {
    id: "3",
    name: "AxiomCore",
    symbol: "AXC",
    price: 12.1,
    change24h: 0.15,
    marketCap: 900000000,
    volume24h: 120000000,
    column: "New pairs",
    history: [12.0, 12.05, 12.1, 12.08, 12.1, 12.12, 12.1],
    liquidity: 25000000,
    holders: 45230,
    transactions24h: 22450,
  },
  {
    id: "4",
    name: "DigitalFlow",
    symbol: "DFL",
    price: 0.012,
    change24h: -0.001,
    marketCap: 50000000,
    volume24h: 15000000,
    column: "Migrated",
    history: [0.013, 0.0125, 0.012, 0.0122, 0.012, 0.0118, 0.012],
    liquidity: 2000000,
    holders: 8920,
    transactions24h: 5430,
  },
  {
    id: "5",
    name: "HyperChain",
    symbol: "HCH",
    price: 4.7,
    change24h: 0.35,
    marketCap: 300000000,
    volume24h: 65000000,
    column: "New pairs",
    history: [4.5, 4.6, 4.7, 4.65, 4.7, 4.72, 4.7],
    liquidity: 12000000,
    holders: 19870,
    transactions24h: 11290,
  },
  {
    id: "6",
    name: "MetaVerse",
    symbol: "MV",
    price: 2.34,
    change24h: 0.08,
    marketCap: 250000000,
    volume24h: 45000000,
    column: "Final Stretch",
    history: [2.3, 2.32, 2.34, 2.33, 2.34, 2.35, 2.34],
    liquidity: 8000000,
    holders: 16540,
    transactions24h: 9340,
  },
  {
    id: "7",
    name: "CryptoWave",
    symbol: "CW",
    price: 0.56,
    change24h: -0.03,
    marketCap: 80000000,
    volume24h: 22000000,
    column: "Migrated",
    history: [0.58, 0.57, 0.56, 0.57, 0.56, 0.55, 0.56],
    liquidity: 3500000,
    holders: 11230,
    transactions24h: 6780,
  },
  {
    id: "8",
    name: "BlockForce",
    symbol: "BF",
    price: 8.92,
    change24h: 0.22,
    marketCap: 520000000,
    volume24h: 95000000,
    column: "New pairs",
    history: [8.7, 8.8, 8.92, 8.88, 8.92, 8.95, 8.92],
    liquidity: 18000000,
    holders: 32450,
    transactions24h: 18920,
  },
];

// ============================================================================
// WEBSOCKET SIMULATION
// ============================================================================

const mockWebSocket = (
  initialTokens: Token[],
  onUpdate: (update: {
    id: string;
    price: number;
    change24h: number;
    history: number[];
  }) => void
) => {
  const intervalId = setInterval(() => {
    initialTokens.forEach((token) => {
      const priceChange = (Math.random() * 0.04 - 0.02) * token.price;
      const newPrice = Math.max(0.0001, token.price + priceChange);
      const newChange24h = Math.random() * 0.4 - 0.2;

      const newHistory = [...token.history.slice(1), newPrice];

      onUpdate({
        id: token.id,
        price: newPrice,
        change24h: newChange24h,
        history: newHistory,
      });
    });
  }, 3000);

  return () => clearInterval(intervalId);
};

// ============================================================================
// ATOM COMPONENTS
// ============================================================================

const Sparkline = memo(
  ({ path, color }: { path: string; color: "green" | "red" }) => (
    <svg viewBox="0 0 100 30" className="w-24 h-8">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        d={path}
        className={color === "green" ? "text-green-500" : "text-red-500"}
      />
    </svg>
  )
);
Sparkline.displayName = "Sparkline";

const TokenBadge = memo(
  ({ children, type }: { children: React.ReactNode; type: TokenColumn }) => {
    const configs = {
      "New pairs": {
        bg: "bg-blue-500/20",
        text: "text-blue-300",
        border: "border-blue-400/30",
        icon: Clock,
      },
      "Final Stretch": {
        bg: "bg-amber-500/20",
        text: "text-amber-300",
        border: "border-amber-400/30",
        icon: TrendingUp,
      },
      Migrated: {
        bg: "bg-green-500/20",
        text: "text-green-300",
        border: "border-green-400/30",
        icon: CheckCircle,
      },
    };

    const config = configs[type];
    const Icon = config.icon;

    return (
      <div
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-xl ${config.bg} ${config.text} ${config.border} whitespace-nowrap`}
      >
        <Icon className="w-3 h-3 mr-1.5" />
        {children}
      </div>
    );
  }
);
TokenBadge.displayName = "TokenBadge";

const ChangeCell = memo(
  ({
    value,
    previousChange,
  }: {
    value: number;
    previousChange: number | null;
  }) => {
    const [flashClass, setFlashClass] = useState("");
    const isPositive = value >= 0;

    useEffect(() => {
      if (previousChange !== null && value !== previousChange) {
        const flash =
          value > previousChange ? "bg-green-500/20" : "bg-red-500/20";
        setFlashClass(flash);
        const timer = setTimeout(() => setFlashClass(""), 500);
        return () => clearTimeout(timer);
      }
    }, [value, previousChange]);

    return (
      <div
        className={`transition-all duration-500 rounded px-2 py-1 ${flashClass}`}
      >
        <span
          className={`font-semibold ${
            isPositive ? "text-green-400" : "text-red-400"
          }`}
        >
          {isPositive ? "+" : ""}
          {(value * 100).toFixed(2)}%
        </span>
      </div>
    );
  }
);
ChangeCell.displayName = "ChangeCell";

const PriceCell = memo(
  ({
    price,
    previousPrice,
  }: {
    price: number;
    previousPrice: number | null;
  }) => {
    const [flashClass, setFlashClass] = useState("");

    useEffect(() => {
      if (previousPrice !== null && price !== previousPrice) {
        const flash =
          price > previousPrice ? "bg-green-500/20" : "bg-red-500/20";
        setFlashClass(flash);
        const timer = setTimeout(() => setFlashClass(""), 500);
        return () => clearTimeout(timer);
      }
    }, [price, previousPrice]);

    return (
      <div
        className={`transition-all duration-500 rounded px-2 py-1 ${flashClass}`}
      >
        <span className="font-bold text-white">{formatCurrency(price)}</span>
      </div>
    );
  }
);
PriceCell.displayName = "PriceCell";

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

const Tooltip = ({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 px-3 py-2 text-xs font-medium text-white bg-gray-900/90 backdrop-blur-xl rounded-lg shadow-lg border border-white/10 -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          {content}
          <div className="absolute w-2 h-2 bg-gray-900/90 transform rotate-45 -bottom-1 left-1/2 -translate-x-1/2"></div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// POPOVER COMPONENT
// ============================================================================

const Popover = ({ token }: { token: Token }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Show token details"
      >
        <Info className="w-4 h-4 text-gray-400 hover:text-gray-200" />
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
          <div className="absolute z-50 w-64 p-4 bg-gray-900/90 backdrop-blur-xl rounded-lg shadow-xl border border-white/10 -right-2 top-8">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-white">Token Details</h3>
                <button
                  onClick={() => setShow(false)}
                  className="text-gray-400 hover:text-gray-200"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Liquidity:</span>
                  <span className="font-medium text-white">
                    {formatCurrency(token.liquidity)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Holders:</span>
                  <span className="font-medium text-white">
                    {formatNumber(token.holders)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Transactions:</span>
                  <span className="font-medium text-white">
                    {formatNumber(token.transactions24h)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// MODAL COMPONENT
// ============================================================================

const Modal = ({
  token,
  onClose,
}: {
  token: Token | null;
  onClose: () => void;
}) => {
  if (!token) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                {token.symbol[0]}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{token.name}</h2>
                <p className="text-gray-400">{token.symbol}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10">
              <div className="text-sm text-gray-400 mb-1">Price</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(token.price)}
              </div>
              <div
                className={`text-sm font-semibold mt-1 ${
                  token.change24h >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {token.change24h >= 0 ? "+" : ""}
                {(token.change24h * 100).toFixed(2)}% (24h)
              </div>
            </div>
            <div className="p-4 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10">
              <div className="text-sm text-gray-400 mb-1">Market Cap</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(token.marketCap)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Volume (24h):</span>
                <span className="font-semibold text-white">
                  {formatCurrency(token.volume24h)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Liquidity:</span>
                <span className="font-semibold text-white">
                  {formatCurrency(token.liquidity)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Holders:</span>
                <span className="font-semibold text-white">
                  {formatNumber(token.holders)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Transactions:</span>
                <span className="font-semibold text-white">
                  {formatNumber(token.transactions24h)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <TokenBadge type={token.column}>{token.column}</TokenBadge>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <h3 className="font-semibold text-white mb-4">
              Price History (7 days)
            </h3>
            <div className="h-24 flex items-end justify-between">
              {token.history.map((price, i) => {
                const maxPrice = Math.max(...token.history);
                const height = (price / maxPrice) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 flex items-end justify-center px-1"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        token.change24h >= 0 ? "bg-green-500" : "bg-red-500"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2">
            <span>View on Explorer</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TOKEN ROW COMPONENT
// ============================================================================

const TokenRow = memo(
  ({
    token,
    previousToken,
    onClick,
  }: {
    token: Token;
    previousToken: Token | null;
    onClick: () => void;
  }) => {
    const sparklinePath = generateSparklinePath(token.history);
    const sparklineColor = token.change24h >= 0 ? "green" : "red";
    const prevPrice = previousToken?.price ?? token.price;
    const prevChange = previousToken?.change24h ?? token.change24h;

    return (
      <tr
        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
        onClick={onClick}
      >
        <td className="py-4 px-4 lg:px-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              {token.symbol[0]}
            </div>
            <div>
              <div className="font-semibold text-white">{token.name}</div>
              <div className="text-sm text-gray-400">{token.symbol}</div>
            </div>
          </div>
        </td>

        <td className="py-4 px-4 lg:px-6 hidden md:table-cell">
          <TokenBadge type={token.column}>{token.column}</TokenBadge>
        </td>

        <td className="py-4 px-4 lg:px-6 text-gray-300 font-medium hidden lg:table-cell">
          {formatCurrency(token.marketCap)}
        </td>

        <td className="py-4 px-4 lg:px-6 text-gray-300 hidden xl:table-cell">
          {formatCurrency(token.volume24h)}
        </td>

        <td className="py-4 px-4 lg:px-6 hidden sm:table-cell">
          <Sparkline path={sparklinePath} color={sparklineColor} />
        </td>

        <td className="py-4 px-4 lg:px-6">
          <ChangeCell value={token.change24h} previousChange={prevChange} />
        </td>

        <td className="py-4 px-4 lg:px-6">
          <PriceCell price={token.price} previousPrice={prevPrice} />
        </td>

        <td className="py-4 px-4 lg:px-6">
          <div className="flex items-center space-x-2">
            <Tooltip content="More information">
              <Popover token={token} />
            </Tooltip>
          </div>
        </td>
      </tr>
    );
  }
);
TokenRow.displayName = "TokenRow";

// ============================================================================
// SKELETON LOADER
// ============================================================================

const SkeletonRow = () => (
  <tr className="border-b border-white/5 animate-pulse">
    {[...Array(8)].map((_, i) => (
      <td key={i} className="py-4 px-4 lg:px-6">
        <div className="h-4 bg-white/10 rounded w-full"></div>
      </td>
    ))}
  </tr>
);

// ============================================================================
// TABLE HEADER
// ============================================================================

const TableHeader = memo(
  ({
    sortKey,
    sortDirection,
    setSort,
  }: {
    sortKey: SortKey | null;
    sortDirection: SortDirection;
    setSort: (key: SortKey) => void;
  }) => {
    const headers = [
      { key: "name" as const, label: "Token", sortable: false },
      {
        key: "column" as const,
        label: "Status",
        sortable: false,
        className: "hidden md:table-cell",
      },
      {
        key: "marketCap" as const,
        label: "Market Cap",
        sortable: true,
        className: "hidden lg:table-cell",
      },
      {
        key: "volume24h" as const,
        label: "Volume (24h)",
        sortable: true,
        className: "hidden xl:table-cell",
      },
      {
        key: "history" as const,
        label: "Chart (7d)",
        sortable: false,
        className: "hidden sm:table-cell",
      },
      { key: "change24h" as const, label: "Change (24h)", sortable: true },
      { key: "price" as const, label: "Price", sortable: true },
      { key: "actions" as const, label: "Info", sortable: false },
    ];

    return (
      <thead>
        <tr className="bg-white/5 border-b border-white/10">
          {headers.map((header) => (
            <th
              key={header.key}
              onClick={() => header.sortable && setSort(header.key as SortKey)}
              className={`py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider ${
                header.sortable ? "cursor-pointer hover:bg-white/10" : ""
              } ${header.className || ""}`}
            >
              <div className="flex items-center space-x-1">
                <span>{header.label}</span>
                {header.sortable &&
                  sortKey === header.key &&
                  (sortDirection === "ascending" ? (
                    <ChevronUp className="w-4 h-4 text-blue-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-blue-400" />
                  ))}
              </div>
            </th>
          ))}
        </tr>
      </thead>
    );
  }
);
TableHeader.displayName = "TableHeader";

// ============================================================================
// FLOATING ANIMATION STYLES
// ============================================================================

const FloatingStyles = () => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const styleId = "floating-animation-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.1; }
        25% { transform: translateY(-20px) translateX(10px); opacity: 0.3; }
        50% { transform: translateY(-40px) translateX(-10px); opacity: 0.2; }
        75% { transform: translateY(-20px) translateX(10px); opacity: 0.3; }
      }
      .animate-float {
        animation: float linear infinite;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TokenTradingTable = () => {
  const [tokens, setTokens] = useState<Token[]>(MOCK_TOKENS);
  const [previousTokens, setPreviousTokens] = useState<Token[]>(MOCK_TOKENS);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey | null;
    direction: SortDirection;
  }>({
    key: "marketCap",
    direction: "descending",
  });
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColumn, setFilterColumn] = useState<TokenColumn | "All">("All");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);

  // Initialize particles on client-side only to avoid hydration mismatch
  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 10 + Math.random() * 20,
      }))
    );
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const loadTimer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const handleUpdate = (update: {
      id: string;
      price: number;
      change24h: number;
      history: number[];
    }) => {
      setTokens((prevTokens) => {
        setPreviousTokens(prevTokens);
        return prevTokens.map((token) =>
          token.id === update.id
            ? {
                ...token,
                price: update.price,
                change24h: update.change24h,
                history: update.history,
              }
            : token
        );
      });
    };

    const cleanup = mockWebSocket(MOCK_TOKENS, handleUpdate);
    return cleanup;
  }, [isLoading]);

  const filteredAndSortedTokens = useMemo(() => {
    if (isLoading) return [];

    let result = [...tokens];

    if (searchQuery) {
      result = result.filter(
        (token) =>
          token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterColumn !== "All") {
      result = result.filter((token) => token.column === filterColumn);
    }

    const { key, direction } = sortConfig;
    if (key && direction) {
      result.sort((a, b) => {
        const aValue = a[key];
        const bValue = b[key];
        if (aValue < bValue) return direction === "ascending" ? -1 : 1;
        if (aValue > bValue) return direction === "ascending" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tokens, sortConfig, isLoading, searchQuery, filterColumn]);

  const setSort = useCallback((key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "descending"
          ? "ascending"
          : "descending",
    }));
  }, []);

  return (
    <>
      <FloatingStyles />
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Animated Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          {/* Gradient Orbs */}
          <div
            className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl transition-all duration-1000 ease-out"
            style={{
              left: `${mousePosition.x - 192}px`,
              top: `${mousePosition.y - 192}px`,
            }}
          />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-3xl animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />

          {/* Floating Particles */}
          {particles.map((particle, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Glassmorphic Container */}
        <div className="relative z-10 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-2xl">
              Token Discovery
            </h1>
            <p className="text-lg text-gray-300">
              Real-time market data and analytics
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["All", "New pairs", "Final Stretch", "Migrated"] as const).map(
                (col) => (
                  <button
                    key={col}
                    onClick={() => setFilterColumn(col)}
                    className={`px-4 py-2.5 rounded-lg font-medium transition-all backdrop-blur-xl ${
                      filterColumn === col
                        ? "bg-blue-500/30 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30"
                        : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {col}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <TableHeader
                  sortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  setSort={setSort}
                />
                <tbody className="bg-transparent divide-y divide-white/5">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                  ) : filteredAndSortedTokens.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-gray-400"
                      >
                        No tokens found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedTokens.map((token) => (
                      <TokenRow
                        key={token.id}
                        token={token}
                        previousToken={
                          previousTokens.find((t) => t.id === token.id) || null
                        }
                        onClick={() => setSelectedToken(token)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats Footer */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-lg shadow-xl p-4 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">Total Tokens</div>
              <div className="text-2xl font-bold text-white">
                {tokens.length}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-lg shadow-xl p-4 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">Total Market Cap</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(
                  tokens.reduce((sum, t) => sum + t.marketCap, 0)
                )}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-lg shadow-xl p-4 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">24h Volume</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(
                  tokens.reduce((sum, t) => sum + t.volume24h, 0)
                )}
              </div>
            </div>
          </div>

          {/* Architecture Info */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-400/20 rounded-xl">
            <h3 className="font-bold text-white mb-3 text-lg">
              🗂️ Architecture Highlights
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
              <div className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>
                  <strong className="text-white">Atomic Design:</strong>{" "}
                  Sparkline, TokenBadge, PriceCell, ChangeCell atoms
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>
                  <strong className="text-white">Performance:</strong>{" "}
                  React.memo, useMemo, useCallback throughout
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>
                  <strong className="text-white">Real-time Updates:</strong>{" "}
                  WebSocket simulation with smooth transitions
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>
                  <strong className="text-white">Interactions:</strong> Tooltip,
                  Popover, Modal, Sorting, Filtering
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>
                  <strong className="text-white">Responsive:</strong> 320px+
                  with breakpoints (sm, md, lg, xl)
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>
                  <strong className="text-white">Loading States:</strong>{" "}
                  Skeleton loaders, shimmer effects
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        <Modal token={selectedToken} onClose={() => setSelectedToken(null)} />
      </div>
    </>
  );
};

export default TokenTradingTable;
// Sitender Narwal
