import React, { useState } from 'react';
import { BinaryFile, DecompiledFunction, DisassembledInstruction, PatchRecord } from '../types/binary';
import { 
  Search, 
  Code, 
  CornerDownRight, 
  Wrench, 
  Check, 
  Copy, 
  Flag,
  Play
} from 'lucide-react';

interface DisassemblyViewProps {
  binary: BinaryFile;
  selectedFunction: DecompiledFunction;
  onSelectFunction: (fn: DecompiledFunction) => void;
  onAddPatch: (patch: Omit<PatchRecord, 'id' | 'timestamp'>) => void;
  onJumpToDebugger: (address: number) => void;
  onJumpToHex: (offset: number) => void;
  breakpoints: number[];
  onToggleBreakpoint: (address: number) => void;
}

export const DisassemblyView: React.FC<DisassemblyViewProps> = ({
  binary,
  selectedFunction,
  onSelectFunction,
  onAddPatch,
  onJumpToDebugger,
  onJumpToHex,
  breakpoints,
  onToggleBreakpoint
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAddress, setCopiedAddress] = useState<number | null>(null);
  const [quickPatchAddr, setQuickPatchAddr] = useState<number | null>(null);
  const [customPatchHex, setCustomPatchHex] = useState('');

  const filteredFunctions = binary.functions.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.signature.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMnemonicColor = (inst: DisassembledInstruction) => {
    if (inst.isReturn) return 'text-white font-bold underline decoration-1';
    if (inst.isCall) return 'text-white font-bold';
    if (inst.isConditionalJump || inst.isJump) return 'text-white font-bold';
    if (inst.isNop) return 'text-[#555555]';
    return 'text-white font-medium';
  };

  const handleCopy = (text: string, address: number) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  // Quick Inline Patch: NOP out instruction
  const handleNopInstruction = (inst: DisassembledInstruction) => {
    const byteCount = inst.hexBytes.split(' ').length || 1;
    const nopBytes = Array(byteCount).fill(0x90);
    const nopHex = nopBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');

    const rawOffset = inst.address - binary.entryPoint + 0x1120;
    const origBytes = inst.hexBytes.split(' ').map(h => parseInt(h, 16));

    onAddPatch({
      address: inst.address,
      offset: rawOffset,
      originalBytes: origBytes,
      patchedBytes: nopBytes,
      originalHex: inst.hexBytes,
      patchedHex: nopHex,
      description: `NOP out "${inst.mnemonic} ${inst.operands}" at 0x${inst.address.toString(16)}`,
      functionName: selectedFunction.name,
      applied: true
    });
  };

  // Quick Inline Patch: Force return 1 (Success)
  const handleForceReturnTrue = (inst: DisassembledInstruction) => {
    const patchBytes = [0xb8, 0x01, 0x00, 0x00, 0x00, 0xc3];
    const patchHex = 'b8 01 00 00 00 c3';
    const rawOffset = inst.address - binary.entryPoint + 0x1120;
    const origBytes = inst.hexBytes.split(' ').map(h => parseInt(h, 16));

    onAddPatch({
      address: inst.address,
      offset: rawOffset,
      originalBytes: origBytes,
      patchedBytes: patchBytes,
      originalHex: inst.hexBytes,
      patchedHex: patchHex,
      description: `Force Return 1 (MOV EAX, 1; RET) at 0x${inst.address.toString(16)}`,
      functionName: selectedFunction.name,
      applied: true
    });
  };

  // Quick Inline Patch: Invert Conditional Branch
  const handleInvertBranch = (inst: DisassembledInstruction) => {
    let newMnem = 'jz';
    let newByte = 0x74;
    if (inst.mnemonic.toLowerCase() === 'jz') {
      newMnem = 'jnz';
      newByte = 0x75;
    }
    const origBytes = inst.hexBytes.split(' ').map(h => parseInt(h, 16));
    const patchedBytes = [newByte, origBytes[1] || 0x00];
    const rawOffset = inst.address - binary.entryPoint + 0x1120;

    onAddPatch({
      address: inst.address,
      offset: rawOffset,
      originalBytes: origBytes,
      patchedBytes,
      originalHex: inst.hexBytes,
      patchedHex: patchedBytes.map(b => b.toString(16).padStart(2, '0')).join(' '),
      description: `Invert Branch (${inst.mnemonic} -> ${newMnem}) at 0x${inst.address.toString(16)}`,
      functionName: selectedFunction.name,
      applied: true
    });
  };

  // Apply custom hex patch
  const handleApplyCustomPatch = (inst: DisassembledInstruction) => {
    const cleanHex = customPatchHex.replace(/[^0-9a-fA-F]/g, '');
    if (cleanHex.length % 2 !== 0 || cleanHex.length === 0) return;

    const patchedBytes: number[] = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      patchedBytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
    }

    const rawOffset = inst.address - binary.entryPoint + 0x1120;
    const origBytes = inst.hexBytes.split(' ').map(h => parseInt(h, 16));

    onAddPatch({
      address: inst.address,
      offset: rawOffset,
      originalBytes: origBytes,
      patchedBytes,
      originalHex: inst.hexBytes,
      patchedHex: patchedBytes.map(b => b.toString(16).padStart(2, '0')).join(' '),
      description: `Custom Hex Patch at 0x${inst.address.toString(16)}`,
      functionName: selectedFunction.name,
      applied: true
    });

    setQuickPatchAddr(null);
    setCustomPatchHex('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 max-w-[1500px] mx-auto font-mono">
      
      {/* Left Sidebar: Functions List */}
      <div className="lg:col-span-1 bg-[#0a0a0a] border border-[#2a2a2a] p-3 flex flex-col h-[740px]">
        
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Code className="w-3.5 h-3.5 text-[#999999]" />
            <h4 className="text-[10px] font-bold text-[#555555] uppercase tracking-widest">FUNCTIONS [{binary.functions.length}]</h4>
          </div>
        </div>

        {/* Function Search Filter */}
        <div className="relative mb-2.5">
          <Search className="w-3 h-3 text-[#555555] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="FILTER FUNCTIONS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black text-xs text-white pl-8 pr-3 py-1.5 border border-[#2a2a2a] focus:border-white focus:outline-none font-mono uppercase"
          />
        </div>

        {/* Functions Scroll List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filteredFunctions.map((fn) => {
            const isSelected = fn.id === selectedFunction.id;
            return (
              <button
                key={fn.id}
                onClick={() => onSelectFunction(fn)}
                className={`w-full text-left p-2 border transition text-xs font-mono group ${
                  isSelected 
                    ? 'bg-white text-black border-white font-bold' 
                    : 'bg-black border-[#2a2a2a] text-[#999999] hover:text-white hover:border-[#555555]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`truncate ${isSelected ? 'text-black' : 'text-white'}`}>
                    {fn.name}
                  </span>
                  <span className={`text-[9px] px-1 py-0.2 border ${
                    isSelected ? 'bg-black text-white border-black' : 'bg-[#111111] text-[#999999] border-[#2a2a2a]'
                  }`}>
                    {fn.size}B
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className={isSelected ? 'text-black font-semibold' : 'text-[#999999]'}>
                    0x{fn.startAddress.toString(16).toUpperCase()}
                  </span>
                  <span className={isSelected ? 'text-black' : 'text-[#555555]'}>CC: {fn.cyclomaticComplexity}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Function Meta Box */}
        <div className="mt-2.5 pt-2.5 border-t border-[#2a2a2a] text-[10px] text-[#555555] font-mono space-y-1 bg-black p-2 border border-[#2a2a2a] uppercase">
          <div className="flex justify-between">
            <span>CALLERS:</span>
            <span className="text-white">{selectedFunction.callers.join(', ') || 'NONE'}</span>
          </div>
          <div className="flex justify-between">
            <span>CALLEES:</span>
            <span className="text-white">{selectedFunction.callees.join(', ') || 'NONE'}</span>
          </div>
        </div>

      </div>

      {/* Right Area: Disassembly Code Table */}
      <div className="lg:col-span-3 bg-[#0a0a0a] border border-[#2a2a2a] p-3.5 flex flex-col h-[740px]">
        
        {/* Function Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#2a2a2a]">
          <div>
            <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <span>{selectedFunction.signature}</span>
            </h3>
            <p className="text-[10px] text-[#555555] font-mono mt-0.5 uppercase">
              RANGE: 0x{selectedFunction.startAddress.toString(16).toUpperCase()} - 0x{selectedFunction.endAddress.toString(16).toUpperCase()} // {selectedFunction.instructions.length} INSTRUCTIONS
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onJumpToDebugger(selectedFunction.startAddress)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-[#111111] text-white text-xs font-bold border border-[#2a2a2a] hover:border-white transition uppercase tracking-wider"
            >
              <Play className="w-3 h-3 text-white" />
              <span>DEBUG AT ENTRY</span>
            </button>
          </div>
        </div>

        {/* Disassembly Code Table */}
        <div className="flex-1 overflow-y-auto mt-2 font-mono text-xs divide-y divide-[#1a1a1a]">
          {selectedFunction.instructions.map((inst) => {
            const isBreakpoint = breakpoints.includes(inst.address);
            const isPatched = binary.patches.some(p => p.address === inst.address && p.applied);
            const isQuickOpen = quickPatchAddr === inst.address;

            return (
              <div 
                key={inst.address}
                className={`py-1.5 px-2 hover:bg-[#111111] transition group flex flex-col ${
                  isPatched ? 'bg-[#181818] border-l-2 border-white' : ''
                } ${isBreakpoint ? 'bg-[#222222]' : ''}`}
              >
                <div className="flex items-center justify-between">
                  {/* Address, Breakpoint & Hex Bytes */}
                  <div className="flex items-center gap-3">
                    
                    {/* Breakpoint Toggle */}
                    <button
                      onClick={() => onToggleBreakpoint(inst.address)}
                      className={`w-3.5 h-3.5 flex items-center justify-center text-[9px] transition border ${
                        isBreakpoint ? 'bg-white text-black border-white font-bold' : 'border-[#333333] text-[#555555] opacity-0 group-hover:opacity-100 hover:border-white'
                      }`}
                      title="Toggle Breakpoint"
                    >
                      {isBreakpoint ? 'B' : ''}
                    </button>

                    {/* Address */}
                    <span 
                      onClick={() => onJumpToDebugger(inst.address)}
                      className="text-white font-bold w-24 cursor-pointer hover:underline"
                      title="Click to jump to CPU emulator"
                    >
                      0x{inst.address.toString(16).toUpperCase()}
                    </span>

                    {/* Opcode Hex */}
                    <span 
                      onClick={() => onJumpToHex(inst.address - binary.entryPoint + 0x1120)}
                      className="text-[#555555] w-36 truncate cursor-pointer hover:text-white"
                      title="Click to view in Hex Editor"
                    >
                      {inst.hexBytes}
                    </span>

                    {/* Mnemonic & Operands */}
                    <div className="flex items-center gap-2">
                      <span className={`w-16 ${getMnemonicColor(inst)}`}>
                        {inst.mnemonic}
                      </span>
                      <span className="text-[#999999]">
                        {inst.operands}
                      </span>
                    </div>
                  </div>

                  {/* Comments, Branch Indicators & Actions */}
                  <div className="flex items-center gap-3">
                    {inst.comment && (
                      <span className="text-[#555555] text-[10px] italic hidden sm:inline">
                        ; {inst.comment}
                      </span>
                    )}

                    {inst.isConditionalJump && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-black text-[#999999] border border-[#2a2a2a] flex items-center gap-1 uppercase">
                        <CornerDownRight className="w-2.5 h-2.5" />
                        BRANCH
                      </span>
                    )}

                    {isPatched && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-white text-black font-bold uppercase">
                        PATCHED
                      </span>
                    )}

                    {/* Action buttons (shown on hover) */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                      
                      {/* Copy Instruction */}
                      <button
                        onClick={() => handleCopy(`0x${inst.address.toString(16)}: ${inst.mnemonic} ${inst.operands}`, inst.address)}
                        className="p-1 bg-[#111111] hover:bg-[#222222] text-[#999999] hover:text-white border border-[#2a2a2a]"
                        title="Copy Assembly"
                      >
                        {copiedAddress === inst.address ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                      </button>

                      {/* Quick Patch Trigger */}
                      <button
                        onClick={() => setQuickPatchAddr(isQuickOpen ? null : inst.address)}
                        className="p-1 bg-[#111111] hover:bg-white hover:text-black text-[#999999] border border-[#2a2a2a]"
                        title="Inline Patch Options"
                      >
                        <Wrench className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Patch Quick Drawer */}
                {isQuickOpen && (
                  <div className="mt-2 p-3 bg-black border border-white space-y-2">
                    <div className="flex items-center justify-between text-xs text-white font-bold uppercase tracking-wider">
                      <span>INLINE ALTERATION (0x{inst.address.toString(16).toUpperCase()})</span>
                      <button 
                        onClick={() => setQuickPatchAddr(null)}
                        className="text-[#555555] hover:text-white text-[10px] uppercase"
                      >
                        [CANCEL]
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleNopInstruction(inst)}
                        className="px-2.5 py-1 bg-[#111111] hover:bg-[#222222] text-xs text-white border border-[#2a2a2a] hover:border-white uppercase"
                      >
                        NOP (0x90)
                      </button>

                      <button
                        onClick={() => handleForceReturnTrue(inst)}
                        className="px-2.5 py-1 bg-[#111111] hover:bg-[#222222] text-xs text-white border border-[#2a2a2a] hover:border-white uppercase"
                      >
                        FORCE RET 1
                      </button>

                      {inst.isConditionalJump && (
                        <button
                          onClick={() => handleInvertBranch(inst)}
                          className="px-2.5 py-1 bg-[#111111] hover:bg-[#222222] text-xs text-white border border-[#2a2a2a] hover:border-white uppercase"
                        >
                          INVERT BRANCH (JZ/JNZ)
                        </button>
                      )}
                    </div>

                    {/* Custom Hex Bytes Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="CUSTOM HEX (E.G. 90 90 B8 01 00 00 00 C3)"
                        value={customPatchHex}
                        onChange={(e) => setCustomPatchHex(e.target.value)}
                        className="flex-1 bg-[#0a0a0a] text-xs text-white px-2.5 py-1.5 border border-[#2a2a2a] focus:border-white focus:outline-none font-mono uppercase"
                      />
                      <button
                        onClick={() => handleApplyCustomPatch(inst)}
                        disabled={!customPatchHex.trim()}
                        className="px-3 py-1.5 bg-white text-black font-bold text-xs uppercase disabled:opacity-30 hover:bg-[#999999] transition"
                      >
                        APPLY PATCH
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};

