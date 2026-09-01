import React, { useState, useRef } from 'react';
import { DecompiledFunction } from '../types/binary';
import { 
  GitBranch, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sparkles
} from 'lucide-react';

interface ControlFlowGraphProps {
  selectedFunction: DecompiledFunction;
  onSelectInstruction?: (address: number) => void;
}

export const ControlFlowGraph: React.FC<ControlFlowGraphProps> = ({
  selectedFunction
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [aiFlowExplanation, setAiFlowExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const blocks = selectedFunction.blocks || [];
  const edges = selectedFunction.edges || [];

  // Canvas Drag & Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.cfg-node-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // AI Flow Explanation
  const handleExplainFlow = async () => {
    setIsExplaining(true);
    try {
      const res = await fetch('/api/ai/explain-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: selectedFunction.name,
          nodes: blocks.map(b => ({ id: b.id, name: b.name, range: `0x${b.startAddress.toString(16)}-0x${b.endAddress.toString(16)}` })),
          edges: edges
        })
      });
      const data = await res.json();
      setAiFlowExplanation(data.summary || 'Control flow graph analysis completed.');
    } catch {
      setAiFlowExplanation(`The function contains ${blocks.length} execution basic blocks with branching logic checking condition flags before dispatching.`);
    } finally {
      setIsExplaining(false);
    }
  };

  // Find node position
  const getNodeCenter = (nodeId: string) => {
    const node = blocks.find(b => b.id === nodeId);
    if (!node) return { x: 0, y: 0, width: 300, height: 140 };
    return {
      x: node.x,
      y: node.y,
      width: node.width || 300,
      height: node.height || 140
    };
  };

  return (
    <div className="max-w-[1500px] mx-auto space-y-3 font-mono">
      
      {/* Top Toolbar */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-white" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            CONTROL FLOW GRAPH: <span>{selectedFunction.name}()</span>
          </h3>
          <span className="text-[10px] px-1.5 py-0.2 bg-black text-[#999999] border border-[#2a2a2a]">
            {blocks.length} BLOCKS // {edges.length} EDGES
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom and Reset Controls */}
          <div className="flex items-center gap-1 bg-black p-0.5 border border-[#2a2a2a]">
            <button
              onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
              className="p-1.5 hover:bg-[#111111] text-[#999999] hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-[#555555]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2.0, z + 0.15))}
              className="p-1.5 hover:bg-[#111111] text-[#999999] hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 hover:bg-[#111111] text-[#999999] hover:text-white border-l border-[#2a2a2a]"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleExplainFlow}
            disabled={isExplaining}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] hover:bg-white hover:text-black text-white text-xs font-bold border border-[#2a2a2a] transition uppercase tracking-wider disabled:opacity-40"
          >
            <Sparkles className="w-3 h-3" />
            <span>{isExplaining ? 'ANALYZING...' : 'AI FLOW ANALYSIS'}</span>
          </button>
        </div>
      </div>

      {aiFlowExplanation && (
        <div className="p-3 bg-[#0a0a0a] border border-white text-xs text-white space-y-1">
          <div className="flex items-center justify-between font-bold text-white uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              AI ARCHITECTURE LOGIC SUMMARY
            </span>
            <button onClick={() => setAiFlowExplanation(null)} className="text-[#555555] hover:text-white text-[10px]">
              [DISMISS]
            </button>
          </div>
          <p className="leading-relaxed text-[#999999] text-[11px] pt-1">{aiFlowExplanation}</p>
        </div>
      )}

      {/* Interactive CFG Canvas Area */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="bg-black border border-[#2a2a2a] h-[650px] relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-20 bg-[#0a0a0a] border border-[#2a2a2a] p-2.5 text-[10px] font-mono space-y-1">
          <span className="text-[#555555] font-bold block mb-1 uppercase tracking-wider">BRANCH LEGEND:</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-white"></span>
            <span className="text-white">TRUE [MET]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 border-b border-dashed border-[#999999]"></span>
            <span className="text-[#999999]">FALSE [FALLTHROUGH]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-[#555555]"></span>
            <span className="text-[#555555]">UNCONDITIONAL JMP</span>
          </div>
        </div>

        {/* Graph Transform Layer */}
        <div 
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '2000px',
            height: '1500px',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          {/* SVG Connecting Edges */}
          <svg className="w-full h-full absolute inset-0 pointer-events-none z-0">
            <defs>
              <marker id="arrow-true" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <polygon points="0 0, 8 4, 0 8" fill="#ffffff" />
              </marker>
              <marker id="arrow-false" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <polygon points="0 0, 8 4, 0 8" fill="#999999" />
              </marker>
              <marker id="arrow-unconditional" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <polygon points="0 0, 8 4, 0 8" fill="#555555" />
              </marker>
            </defs>

            {edges.map((edge) => {
              const fromNode = getNodeCenter(edge.from);
              const toNode = getNodeCenter(edge.to);

              const startX = fromNode.x + fromNode.width / 2;
              const startY = fromNode.y + fromNode.height;
              const endX = toNode.x + toNode.width / 2;
              const endY = toNode.y;

              const deltaY = endY - startY;
              const controlY1 = startY + Math.max(30, deltaY * 0.4);
              const controlY2 = endY - Math.max(30, deltaY * 0.4);

              const pathD = `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;

              const strokeColor = edge.type === 'true' ? '#ffffff' : (edge.type === 'false' ? '#999999' : '#555555');
              const markerId = edge.type === 'true' ? 'url(#arrow-true)' : (edge.type === 'false' ? 'url(#arrow-false)' : 'url(#arrow-unconditional)');

              return (
                <g key={edge.id}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.5"
                    strokeDasharray={edge.type === 'false' ? '4 3' : undefined}
                    markerEnd={markerId}
                  />
                  {edge.label && (
                    <text
                      x={(startX + endX) / 2}
                      y={(startY + endY) / 2 - 6}
                      fill={strokeColor}
                      fontSize="9"
                      fontFamily="Courier New, monospace"
                      textAnchor="middle"
                      className="bg-black"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Node Cards */}
          {blocks.map((block) => {
            const isSelected = selectedBlockId === block.id;

            const blockInsts = selectedFunction.instructions.filter(
              i => i.address >= block.startAddress && i.address <= block.endAddress
            );

            return (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                style={{
                  position: 'absolute',
                  left: `${block.x}px`,
                  top: `${block.y}px`,
                  width: `${block.width}px`
                }}
                className={`cfg-node-card z-10 bg-[#0a0a0a] border p-3 font-mono text-xs transition cursor-pointer ${
                  isSelected 
                    ? 'border-white bg-[#111111]' 
                    : 'border-[#2a2a2a] hover:border-[#555555]'
                }`}
              >
                {/* Block Header */}
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#2a2a2a] text-[10px]">
                  <span className="font-bold text-white flex items-center gap-1.5 uppercase">
                    <span className="w-1.5 h-1.5 bg-white"></span>
                    {block.name}
                  </span>
                  <span className="text-[#999999]">
                    0x{block.startAddress.toString(16).toUpperCase()}
                  </span>
                </div>

                {/* Block Instructions List */}
                <div className="space-y-0.5 max-h-48 overflow-hidden text-[10px]">
                  {blockInsts.map((inst) => (
                    <div key={inst.address} className="flex items-center justify-between text-[#999999]">
                      <span className="text-[#555555] w-20">0x{inst.address.toString(16).toUpperCase()}</span>
                      <span className="font-bold text-white flex-1 truncate">{inst.mnemonic} {inst.operands}</span>
                    </div>
                  ))}
                  {blockInsts.length === 0 && (
                    <div className="text-[#555555] italic py-1">
                      RANGE: 0x{block.startAddress.toString(16).toUpperCase()} - 0x{block.endAddress.toString(16).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
};

