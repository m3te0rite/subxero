import React from 'react';
import { BinaryFile } from '../types/binary';
import { 
  FileCode2, 
  Cpu, 
  ShieldCheck, 
  Layers, 
  Terminal, 
  GitBranch, 
  Wrench, 
  Hash, 
  ArrowRight,
  Database
} from 'lucide-react';

interface BinaryOverviewProps {
  binary: BinaryFile;
  onNavigateTab: (tab: string) => void;
  onOpenRecompiler: () => void;
}

export const BinaryOverview: React.FC<BinaryOverviewProps> = ({
  binary,
  onNavigateTab,
  onOpenRecompiler
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto font-mono">
      
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#555555] uppercase tracking-widest font-mono">FORMAT // ARCH</p>
            <h3 className="text-base font-bold text-white font-mono mt-1 flex items-center gap-2">
              {binary.format}
              <span className="text-[10px] px-1.5 py-0.2 bg-[#111111] text-[#999999] border border-[#2a2a2a]">
                {binary.architecture}
              </span>
            </h3>
            <p className="text-[10px] text-[#555555] mt-1 uppercase">{binary.bitness}-BIT // {binary.endianness}</p>
          </div>
          <div className="w-8 h-8 bg-[#111111] border border-[#2a2a2a] flex items-center justify-center text-white">
            <Cpu className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#555555] uppercase tracking-widest font-mono">FILE SIZE</p>
            <h3 className="text-base font-bold text-white font-mono mt-1">
              {formatBytes(binary.size)}
            </h3>
            <p className="text-[10px] text-[#555555] mt-1 uppercase">{binary.sections.length} SECTIONS // {binary.symbols.length} SYMBOLS</p>
          </div>
          <div className="w-8 h-8 bg-[#111111] border border-[#2a2a2a] flex items-center justify-center text-white">
            <Layers className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#555555] uppercase tracking-widest font-mono">ENTRY POINT</p>
            <h3 className="text-base font-bold text-white font-mono mt-1">
              0x{binary.entryPoint.toString(16).toUpperCase()}
            </h3>
            <p className="text-[10px] text-[#555555] mt-1 uppercase">BASE: 0x{binary.baseAddress.toString(16).toUpperCase()}</p>
          </div>
          <div className="w-8 h-8 bg-[#111111] border border-[#2a2a2a] flex items-center justify-center text-white">
            <Terminal className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#555555] uppercase tracking-widest font-mono">PATCH HOOKS</p>
            <h3 className="text-base font-bold text-white font-mono mt-1 flex items-center gap-2">
              {binary.patches.filter(p => p.applied).length} ACTIVE
              {binary.patches.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-[#111111] text-[#999999] border border-[#2a2a2a]">
                  QUEUED
                </span>
              )}
            </h3>
            <p className="text-[10px] text-[#555555] mt-1 uppercase">{binary.patches.length} TOTAL INJECTIONS</p>
          </div>
          <div className="w-8 h-8 bg-[#111111] border border-[#2a2a2a] flex items-center justify-center text-white">
            <Wrench className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Checksums & Hashes Section */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3.5">
        <div className="flex items-center gap-2 mb-2.5">
          <Hash className="w-3.5 h-3.5 text-[#999999]" />
          <h4 className="text-[10px] font-bold text-[#555555] uppercase tracking-widest">CRYPTOGRAPHIC IDENTITY // MAGIC BYTES</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="bg-black p-2.5 border border-[#2a2a2a]">
            <span className="text-[#555555] text-[10px] block mb-1 uppercase tracking-wider">MAGIC SIGNATURE:</span>
            <span className="text-white font-bold">{binary.magic || '7F 45 4C 46 02 01'}</span>
          </div>
          <div className="bg-black p-2.5 border border-[#2a2a2a]">
            <span className="text-[#555555] text-[10px] block mb-1 uppercase tracking-wider">SHA-256 HASH:</span>
            <span className="text-[#999999] truncate block" title={binary.hashes.sha256}>{binary.hashes.sha256}</span>
          </div>
          <div className="bg-black p-2.5 border border-[#2a2a2a]">
            <span className="text-[#555555] text-[10px] block mb-1 uppercase tracking-wider">MD5 HASH:</span>
            <span className="text-[#999999] truncate block" title={binary.hashes.md5}>{binary.hashes.md5}</span>
          </div>
        </div>
      </div>

      {/* Binary Sections & Memory Map Visualizer */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#999999]" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">SECTION LAYOUT & VIRTUAL MEMORY MAP</h4>
          </div>
          <span className="text-[10px] text-[#555555] uppercase">RANGE: 0x{binary.baseAddress.toString(16).toUpperCase()} - 0x{(binary.baseAddress + binary.size + 0x10000).toString(16).toUpperCase()}</span>
        </div>

        {/* Visual Memory Block Bar */}
        <div className="h-8 w-full bg-black p-0.5 flex gap-0.5 border border-[#2a2a2a] overflow-hidden">
          {binary.sections.map((sec, idx) => {
            const widthPct = Math.max(12, Math.min(45, (sec.virtualSize / (binary.size || 1)) * 100));
            return (
              <div
                key={sec.id}
                style={{ width: `${widthPct}%` }}
                className={`h-full flex items-center justify-center px-2 text-[10px] font-mono border border-[#2a2a2a] hover:bg-[#222222] transition cursor-pointer truncate ${
                  idx % 2 === 0 ? 'bg-[#111111] text-white' : 'bg-[#181818] text-[#999999]'
                }`}
                title={`${sec.name} | Virtual: 0x${sec.virtualAddress.toString(16).toUpperCase()} | Size: ${sec.virtualSize} B | Perms: ${sec.permissions}`}
                onClick={() => onNavigateTab('hex')}
              >
                <span className="font-bold">{sec.name}</span>
                <span className="text-[9px] text-[#555555] ml-1 hidden sm:inline">[{sec.permissions}]</span>
              </div>
            );
          })}
        </div>

        {/* Sections Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-[#555555] text-[10px] uppercase tracking-wider">
                <th className="pb-2">SECTION</th>
                <th className="pb-2">TYPE</th>
                <th className="pb-2">VIRTUAL ADDR</th>
                <th className="pb-2">VIRTUAL SIZE</th>
                <th className="pb-2">RAW OFFSET</th>
                <th className="pb-2">PERMISSIONS</th>
                <th className="pb-2">ENTROPY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {binary.sections.map((sec) => (
                <tr key={sec.id} className="hover:bg-[#111111] transition">
                  <td className="py-2 text-white font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white"></span>
                    {sec.name}
                  </td>
                  <td className="py-2 text-[#999999]">
                    <span className="px-1.5 py-0.2 bg-black border border-[#2a2a2a] text-[10px]">
                      {sec.type}
                    </span>
                  </td>
                  <td className="py-2 text-white">0x{sec.virtualAddress.toString(16).toUpperCase()}</td>
                  <td className="py-2 text-[#999999]">{sec.virtualSize} B</td>
                  <td className="py-2 text-[#555555]">0x{sec.rawOffset.toString(16).toUpperCase()}</td>
                  <td className="py-2 text-white font-bold">{sec.permissions}</td>
                  <td className="py-2">
                    <span className="px-1.5 py-0.2 border border-[#2a2a2a] bg-black text-[10px] text-white">
                      {sec.entropy.toFixed(2)} / 8.00
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Launch Workbench Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        <div 
          onClick={() => onNavigateTab('disassembly')}
          className="bg-[#0a0a0a] border border-[#2a2a2a] hover:border-white p-3.5 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 bg-[#111111] border border-[#2a2a2a] text-white flex items-center justify-center">
              <FileCode2 className="w-3.5 h-3.5" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#555555] group-hover:text-white transition" />
          </div>
          <h5 className="font-bold text-white text-xs uppercase tracking-wider">DISASSEMBLY // OPCODES</h5>
          <p className="text-[11px] text-[#999999] mt-1">
            Opcode disassembly table with syntax-colored mnemonics, operands, and C pseudocode generation.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab('cfg')}
          className="bg-[#0a0a0a] border border-[#2a2a2a] hover:border-white p-3.5 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 bg-[#111111] border border-[#2a2a2a] text-white flex items-center justify-center">
              <GitBranch className="w-3.5 h-3.5" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#555555] group-hover:text-white transition" />
          </div>
          <h5 className="font-bold text-white text-xs uppercase tracking-wider">CONTROL FLOW GRAPH (CFG)</h5>
          <p className="text-[11px] text-[#999999] mt-1">
            Interactive block visualizer with conditional branches, execution jump arcs, and block inspection.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab('debugger')}
          className="bg-[#0a0a0a] border border-[#2a2a2a] hover:border-white p-3.5 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 bg-[#111111] border border-[#2a2a2a] text-white flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#555555] group-hover:text-white transition" />
          </div>
          <h5 className="font-bold text-white text-xs uppercase tracking-wider">CPU DEBUGGER & REPL</h5>
          <p className="text-[11px] text-[#999999] mt-1">
            Step-by-step CPU emulation, register matrix, stack inspector, breakpoints, and interactive GDB console.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab('hex')}
          className="bg-[#0a0a0a] border border-[#2a2a2a] hover:border-white p-3.5 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 bg-[#111111] border border-[#2a2a2a] text-white flex items-center justify-center">
              <Database className="w-3.5 h-3.5" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#555555] group-hover:text-white transition" />
          </div>
          <h5 className="font-bold text-white text-xs uppercase tracking-wider">HEX MATRIX EDITOR</h5>
          <p className="text-[11px] text-[#999999] mt-1">
            Raw 16-byte hex inspector, ASCII translation, offset jumping, data type interpretation, and direct byte editing.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab('injector')}
          className="bg-[#0a0a0a] border border-[#2a2a2a] hover:border-white p-3.5 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 bg-[#111111] border border-[#2a2a2a] text-white flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#555555] group-hover:text-white transition" />
          </div>
          <h5 className="font-bold text-white text-xs uppercase tracking-wider">FEATURE INJECTOR & HOOKS</h5>
          <p className="text-[11px] text-[#999999] mt-1">
            Inject custom code hooks, invert branching logic, bypass authentication checks, and patch instructions.
          </p>
        </div>

        <div 
          onClick={onOpenRecompiler}
          className="bg-[#0a0a0a] border border-[#2a2a2a] hover:border-white p-3.5 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 bg-white text-black flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#555555] group-hover:text-white transition" />
          </div>
          <h5 className="font-bold text-white text-xs uppercase tracking-wider">CROSS-PLATFORM RECOMPILER</h5>
          <p className="text-[11px] text-[#999999] mt-1">
            Export patched binaries across Linux ELF, Windows PE, macOS Mach-O, WASM, and standalone C runners.
          </p>
        </div>

      </div>

    </div>
  );
};

