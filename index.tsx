import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type Status = 'active' | 'idle' | 'critical';

interface NodeData {
  id: string;
  hash: string;
  nodeIdentity: string;
  status: Status;
  latency: number;
  load: number;
}

// --- Hooks ---

// Debounce Hook for Search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// Custom Virtualizer Hook (Optimized)
const useVirtualizer = (
  count: number,
  itemHeight: number,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  overscan = 20
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Use requestAnimationFrame for smooth scrolling updates
    let rAF: number;
    const handleScroll = () => {
      rAF = requestAnimationFrame(() => {
        setScrollTop(container.scrollTop);
      });
    };

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rAF);
    };
  }, [scrollContainerRef]);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(count - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

  const items = useMemo(() => {
    const res = [];
    for (let i = startIndex; i <= endIndex; i++) {
      res.push({ index: i, start: i * itemHeight });
    }
    return res;
  }, [startIndex, endIndex, itemHeight]);

  const totalHeight = count * itemHeight;

  return { items, totalHeight, startIndex };
};

// --- Mock Data Generator (Chunked) ---
const CHUNK_SIZE = 2000;
const TOTAL_ROWS = 100000;

const generateChunk = (startIdx: number, size: number): NodeData[] => {
  const chunk: NodeData[] = [];
  for (let i = 0; i < size; i++) {
    const index = startIdx + i;
    const isCritical = Math.random() > 0.98;
    const isIdle = Math.random() > 0.85;
    const status = isCritical ? 'critical' : isIdle ? 'idle' : 'active';

    // Optimized hash generation
    const hash = `0x${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`.toUpperCase();

    chunk.push({
      id: index.toString(),
      hash,
      nodeIdentity: `US-EAST-${(index % 50) + 1}-SRV-${Math.floor(1000 + Math.random() * 9000)}`,
      status,
      latency: status === 'critical' ? Math.floor(200 + Math.random() * 800) : Math.floor(10 + Math.random() * 50),
      load: status === 'critical' ? Math.floor(90 + Math.random() * 10) : Math.floor(20 + Math.random() * 60),
    });
  }
  return chunk;
};

// --- Components ---

const LoadingScreen = ({ progress }: { progress: number }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      className="fixed inset-0 z-[1000] bg-[#02010a] flex flex-col items-center justify-center font-mono"
    >
      <div className="w-64 space-y-4">
        <div className="flex justify-between text-xs text-purple-400 tracking-widest uppercase">
          <span>System Initialization</span>
          <span>{Math.round(progress)}%</span>
        </div>

        {/* Progress Bar Container */}
        <div className="h-[2px] w-full bg-slate-800 relative overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-purple-500 shadow-[0_0_15px_#a855f7]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "tween", ease: "linear", duration: 0.1 }}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <div className={`w-1.5 h-1.5 rounded-full ${progress > 20 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            <span>CORE MODULES LOADED</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <div className={`w-1.5 h-1.5 rounded-full ${progress > 50 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            <span>ESTABLISHING NODE UPLINK</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <div className={`w-1.5 h-1.5 rounded-full ${progress > 80 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            <span>SYNCING TELEMETRY STREAMS</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const PulseHeader = React.memo(({ onSearch }: { onSearch: (val: string) => void }) => {
  return (
    <header
      className="flex-none h-auto md:h-20 w-full glass-panel z-50 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-8 py-3 md:py-0 sticky top-0 gap-3 md:gap-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(2, 1, 10, 0.6)' }}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-12 w-full md:w-auto">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="relative">
            <div className="absolute -inset-1 bg-purple-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img
              src="/logo.png"
              alt="Zen Metrics"
              className="h-8 md:h-10 w-auto relative z-10 drop-shadow-[0_0_15px_rgba(124,58,237,0.8)]"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white uppercase font-[Outfit]">
              Zen<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Metrics</span>
            </h1>
            <span className="text-[9px] text-slate-500 font-mono tracking-[0.3em] uppercase hidden md:block">System Override</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative group w-full md:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="SEARCH NODES..."
            onChange={(e) => onSearch(e.target.value)}
            className="bg-slate-900/40 border border-white/5 text-xs text-white rounded-md pl-9 pr-4 py-2 w-full md:w-72 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600 font-mono tracking-wide backdrop-blur-sm hover:bg-slate-900/60"
          />
        </div>
      </div>

      <div className="flex items-center justify-between w-full md:w-auto gap-8 font-mono text-xs mt-2 md:mt-0">
        <div className="flex items-center gap-3 bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/10">
          <div className="neon-container w-3 h-3">
            <div className="neon-ripple bg-emerald-500" />
            <div className="neon-core bg-emerald-400" />
          </div>
          <span className="text-emerald-400 font-semibold tracking-wide text-[10px]">OPERATIONAL</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-slate-500 text-[9px] uppercase tracking-widest mb-0.5">Active Nodes</span>
          <span className="text-white font-bold tracking-tight">100,000</span>
        </div>
      </div>
    </header>
  );
});

const EqualizerGraph = React.memo(() => {
  const barCount = 48;
  const bars = useMemo(() => Array.from({ length: barCount }).map((_, i) => ({
    id: i,
    duration: 0.6 + Math.random() * 0.8,
    maxScale: 0.3 + Math.random() * 0.6
  })), []);

  return (
    <div className="w-full h-48 md:h-64 flex flex-col justify-end px-4 md:px-12 py-6 relative overflow-hidden">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

      {/* Throughput Text Overlay */}
      <div className="absolute top-8 left-6 md:left-12 z-10 pointer-events-none">
        <div className="flex items-baseline gap-2">
          <h2 className="text-4xl md:text-6xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tighter drop-shadow-2xl">
            98.4
          </h2>
          <span className="text-lg md:text-2xl text-purple-400 font-light">%</span>
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-2 pl-1 font-mono border-l-2 border-purple-500 pl-3">Global Throughput</p>
      </div>

      <div className="flex items-end justify-between gap-1 h-32 w-full max-w-4xl ml-auto z-10 masking-gradient-b">
        {bars.map((bar) => (
          <motion.div
            key={bar.id}
            className="flex-1 bg-gradient-to-t from-purple-900/40 via-purple-600/30 to-purple-400/20 rounded-t-[2px] backdrop-blur-[1px]"
            style={{
              transformOrigin: 'bottom',
              height: '100%'
            }}
            initial={{ scaleY: 0.1 }}
            animate={{ scaleY: [0.1, bar.maxScale, 0.1] }}
            transition={{
              duration: bar.duration * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              repeatType: "reverse"
            }}
          />
        ))}
      </div>

      {/* Bottom Line Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
    </div>
  );
});

const StatusBadge = React.memo(({ status }: { status: Status }) => {
  const styles = {
    active: 'bg-emerald-900/20 text-emerald-400 ring-1 ring-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
    idle: 'bg-slate-800/20 text-slate-500 ring-1 ring-slate-700/20',
    critical: 'bg-red-900/20 text-red-400 ring-1 ring-red-500/10 shadow-[0_0_15px_rgba(248,113,113,0.05)] animate-pulse',
  };

  return (
    <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-mono font-medium ${styles[status]} uppercase tracking-widest inline-flex items-center gap-1.5`}>
      <span className={`w-1 h-1 rounded-full ${status === 'active' ? 'bg-emerald-500' : status === 'critical' ? 'bg-red-500' : 'bg-slate-500'}`}></span>
      {status}
    </span>
  );
});

const LoadBar = React.memo(({ load, status }: { load: number, status: Status }) => {
  let color = 'bg-gradient-to-r from-purple-600 to-cyan-500';
  if (status === 'critical') color = 'bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
  if (status === 'idle') color = 'bg-slate-700';

  return (
    <div className="w-full h-1 bg-slate-800/60 rounded-full overflow-hidden backdrop-blur-sm">
      <div
        className={`h-full ${color} transition-all duration-300 rounded-full`}
        style={{ width: `${load}%` }}
      />
    </div>
  );
});

const DetailPanel = React.memo(({ node, onClose }: { node: NodeData, onClose: () => void }) => {
  // Simulated sparkline data
  const history = useMemo(() => Array.from({ length: 24 }).map(() => Math.random() * 100), []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-[2px] z-[60]"
      />
      <motion.aside
        initial={{ x: '100%', opacity: 0.5 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 180 }}
        className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-[#02010a]/95 glass-panel border-l border-white/5 z-[70] shadow-[-40px_0_60px_rgba(0,0,0,0.8)] flex flex-col backdrop-blur-2xl"
      >
        <div className="p-8 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white font-[Outfit] tracking-tight">{node.nodeIdentity}</h2>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-1 block">Node Configuration Details</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={node.status} />
            <span className="text-xs text-slate-500 font-mono tracking-widest border-l border-white/10 pl-4">{node.hash}</span>
          </div>
        </div>

        <div className="p-8 space-y-10 overflow-y-auto flex-1">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.03] p-5 rounded-lg border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 blur-2xl -mr-10 -mt-10 group-hover:bg-purple-500/20 transition-all rounded-full" />
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-mono">Latency</span>
              <span className="text-3xl font-light text-white tracking-tight">{node.latency} <span className="text-sm text-slate-600 font-normal">ms</span></span>
            </div>
            <div className="bg-white/[0.03] p-5 rounded-lg border border-white/5 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 blur-2xl -mr-10 -mt-10 group-hover:bg-cyan-500/20 transition-all rounded-full" />
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-mono">Load Factor</span>
              <span className="text-3xl font-light text-white tracking-tight">{node.load} <span className="text-sm text-slate-600 font-normal">%</span></span>
            </div>
          </div>

          {/* Visualizer */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Throughput History</h3>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">LIVE</span>
            </div>
            <div className="h-40 flex items-end gap-[3px]">
              {history.map((val, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${val}%` }}
                  transition={{ delay: i * 0.03, duration: 0.6, type: "spring" }}
                  className="flex-1 bg-gradient-to-t from-purple-500/40 to-cyan-400/60 rounded-t-[1px] hover:to-white/80 transition-colors"
                />
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-6">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 font-mono">System Telemetry</h3>
            <div className="grid grid-cols-[120px_1fr] gap-y-4 text-xs">
              <span className="text-slate-600 font-mono">Region Zone</span>
              <span className="text-slate-300">US-EAST-1A</span>

              <span className="text-slate-600 font-mono">IP Address</span>
              <span className="text-slate-300 font-mono text-xs bg-white/5 px-2 py-0.5 rounded w-fit">10.0.{(Math.random() * 255).toFixed(0)}.{(Math.random() * 255).toFixed(0)}</span>

              <span className="text-slate-600 font-mono">Kernel Ver</span>
              <span className="text-slate-300">Linux 5.15.0-76-generic (SMP)</span>

              <span className="text-slate-600 font-mono">Uptime</span>
              <span className="text-slate-300">14d 2h 12m 33s</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-[#050310]">
          <button className="w-full py-3 bg-white text-black hover:bg-purple-50 text-xs font-bold tracking-widest uppercase transition-all rounded shadow-lg shadow-white/5 hover:shadow-white/20 active:scale-[0.99] flex items-center justify-center gap-2">
            <span>Initiate Diagnostics</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </button>
        </div>
      </motion.aside>
    </>
  );
});

const Footer = React.memo(() => (
  <footer className="w-full py-8 mt-12 mb-4 border-t border-white/5">
    <div className="flex flex-col items-center justify-center gap-3 text-center opacity-60 hover:opacity-100 transition-opacity">
      <p className="text-slate-500 text-[10px] font-mono tracking-widest uppercase">
        &copy; {new Date().getFullYear()} Zen Metrics. Specialized Performance Engine.
      </p>
      <div className="flex items-center gap-2">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-purple-500/50"></span>
        <p className="text-purple-400 text-[9px] font-mono uppercase tracking-[0.2em] drop-shadow-sm">
          Systems Nominal
        </p>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-purple-500/50"></span>
      </div>
    </div>
  </footer>
));

// --- Main Application ---

const App = () => {
  const ROW_HEIGHT = 48; // px

  // State
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Async Data Generation to prevent blocking main thread
  useEffect(() => {
    let currentIdx = 0;

    function generateNextChunk() {
      if (currentIdx >= TOTAL_ROWS) {
        setLoading(false);
        return;
      }

      // Generate a small chunk
      const chunk = generateChunk(currentIdx, CHUNK_SIZE);
      setNodes(prev => [...prev, ...chunk]);
      currentIdx += CHUNK_SIZE;
      setProgress((currentIdx / TOTAL_ROWS) * 100);

      // Schedule next chunk for next idle frame
      setTimeout(generateNextChunk, 0);
    }

    generateNextChunk();
  }, []);

  const filteredNodes = useMemo(() => {
    if (!debouncedSearch) return nodes;
    const lower = debouncedSearch.toLowerCase();
    return nodes.filter(n =>
      n.nodeIdentity.toLowerCase().includes(lower) ||
      n.hash.toLowerCase().includes(lower)
    );
  }, [nodes, debouncedSearch]);

  const selectedNode = useMemo(() =>
    selectedId ? nodes.find(n => n.id === selectedId) : null,
    [selectedId, nodes]);

  // Virtualization
  const scrollRef = useRef<HTMLDivElement>(null);
  const { items, totalHeight } = useVirtualizer(filteredNodes.length, ROW_HEIGHT, scrollRef);

  return (
    <div className="h-screen w-full flex flex-col bg-[#030014] text-slate-300 selection:bg-purple-500/30 selection:text-white overflow-hidden">

      {/* Loading Screen Overlay */}
      <AnimatePresence>
        {loading && <LoadingScreen progress={progress} />}
      </AnimatePresence>

      {/* 1. App Shell Header */}
      <PulseHeader onSearch={setSearchQuery} />

      {/* 2. Main Scroll Area */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative scroll-smooth"
      >
        {/* Graph Section */}
        <section className="mb-0 border-b border-white/5 shadow-2xl relative z-10">
          <EqualizerGraph />
        </section>

        {/* Data Table Section */}
        <section className="pb-0 relative min-h-[500px]">
          {/* Breathing Gap Layout Wrapper */}
          <div className="px-0 md:px-12">

            {/* Sticky Header */}
            <div className="sticky top-0 z-40 bg-[#030014] border-b border-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,1)]">
              <div className="grid grid-cols-12 gap-2 md:gap-4 py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div className="col-span-12 md:col-span-3 pl-2 hidden md:block">Hash ID</div>
                <div className="col-span-8 md:col-span-4">Node Identity</div>
                <div className="col-span-4 md:col-span-2 text-right md:text-left">Status</div>
                <div className="col-span-2 md:col-span-1 text-right hidden md:block">Latency</div>
                <div className="col-span-2 pl-4 hidden md:block">Load Factor</div>
              </div>
            </div>

            {/* Virtual List Container */}
            <div
              style={{ height: `${totalHeight}px`, position: 'relative' }}
              className="w-full"
            >
              {items.map(({ index, start }) => {
                const node = filteredNodes[index];
                if (!node) return null;
                const isSelected = selectedId === node.id;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedId(node.id)}
                    className={`absolute top-0 left-0 w-full grid grid-cols-12 gap-2 md:gap-4 items-center border-b cursor-pointer transition-all duration-150 px-4 group ${isSelected
                      ? 'bg-purple-500/10 border-purple-500/30 z-10'
                      : 'border-white/5 hover:bg-white/[0.02]'
                      }`}
                    style={{
                      height: `${ROW_HEIGHT}px`,
                      transform: `translateY(${start}px)`
                    }}
                  >
                    {/* Column 1: Hash */}
                    <div className="col-span-3 font-mono text-xs pl-2 truncate items-center group-hover:text-purple-300 transition-colors hidden md:flex">
                      <span className={`text-slate-600 mr-3 text-[10px] ${isSelected ? 'opacity-100' : 'opacity-40'}`}>0x</span>
                      <span className={`${isSelected ? 'text-white' : 'text-slate-400'} tracking-tight`}>{node.hash}</span>
                    </div>

                    {/* Column 2: Identity */}
                    <div className="col-span-8 md:col-span-4 text-xs text-slate-400 truncate font-mono group-hover:text-slate-200 transition-colors">
                      {node.nodeIdentity}
                    </div>

                    {/* Column 3: Status */}
                    <div className="col-span-4 md:col-span-2 text-right md:text-left">
                      <StatusBadge status={node.status} />
                    </div>

                    {/* Column 4: Latency */}
                    <div className="col-span-1 font-mono text-xs text-right hidden md:block">
                      <span className={node.latency > 500 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]' : 'text-slate-400'}>
                        {node.latency}
                      </span>
                      <span className="text-slate-700 ml-1 text-[10px]">ms</span>
                    </div>

                    {/* Column 5: Load Bar */}
                    <div className="col-span-2 pl-4 items-center gap-3 hidden md:flex">
                      <LoadBar load={node.load} status={node.status} />
                      <span className="text-[10px] text-slate-500 font-mono w-8 text-right tabular-nums">{node.load}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {items.length === 0 && !loading && (
              <div className="py-20 text-center text-slate-500 font-mono text-sm">
                NO NODES FOUND MATCHING QUERY
              </div>
            )}

          </div>
        </section>

        {/* Footer at the bottom of the scroll view */}
        <Footer />
      </main>

      {/* Interactive Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);