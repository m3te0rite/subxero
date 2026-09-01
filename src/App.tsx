import React, { useState, useEffect } from 'react';
import { BinaryFile, DecompiledFunction, PatchRecord, CpuState } from './types/binary';
import { SAMPLE_BINARIES } from './data/sampleBinaries';
import { parseUploadedBinary } from './lib/binaryParser';
import { createInitialCpuState } from './lib/cpuEmulator';

import { Navbar } from './components/Navbar';
import { BinaryOverview } from './components/BinaryOverview';
import { DisassemblyView } from './components/DisassemblyView';
import { PseudocodeView } from './components/PseudocodeView';
import { ControlFlowGraph } from './components/ControlFlowGraph';
import { DebuggerConsole } from './components/DebuggerConsole';
import { HexEditor } from './components/HexEditor';
import { FeatureInjector } from './components/FeatureInjector';
import { RecompilerModal } from './components/RecompilerModal';
import { StringsSymbolsTable } from './components/StringsSymbolsTable';

export default function App() {
  const [currentBinary, setCurrentBinary] = useState<BinaryFile>(SAMPLE_BINARIES[0]);
  const [selectedFunction, setSelectedFunction] = useState<DecompiledFunction>(SAMPLE_BINARIES[0].functions[0]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isRecompilerOpen, setIsRecompilerOpen] = useState(false);
  const [hexJumpOffset, setHexJumpOffset] = useState<number>(0);
  const [breakpoints, setBreakpoints] = useState<number[]>([SAMPLE_BINARIES[0].functions[0]?.instructions[2]?.address || 0x401140]);
  
  // CPU Emulator State
  const [cpuState, setCpuState] = useState<CpuState>(() => 
    createInitialCpuState(SAMPLE_BINARIES[0].architecture, SAMPLE_BINARIES[0].entryPoint)
  );

  // When changing binary, reset function and CPU state
  const handleSelectBinary = (binary: BinaryFile) => {
    setCurrentBinary(binary);
    const initialFn = binary.functions[0] || {
      id: 'fn_fallback',
      name: 'main',
      signature: 'int main()',
      startAddress: binary.entryPoint,
      endAddress: binary.entryPoint + 0x50,
      size: 80,
      cyclomaticComplexity: 1,
      callers: [],
      callees: [],
      instructions: [],
      pseudocode: 'int main() {\n    return 0;\n}',
      variables: []
    };
    setSelectedFunction(initialFn);
    const newCpu = createInitialCpuState(binary.architecture, binary.entryPoint);
    setCpuState(newCpu);
    setBreakpoints([binary.entryPoint]);
  };

  // Upload Custom User Binary
  const handleFileUpload = async (file: File) => {
    try {
      const parsed = await parseUploadedBinary(file);
      setCurrentBinary(parsed);
      setSelectedFunction(parsed.functions[0]);
      setCpuState(createInitialCpuState(parsed.architecture, parsed.entryPoint));
      setBreakpoints([parsed.entryPoint]);
      setActiveTab('overview');
    } catch (err) {
      console.error('Failed to parse uploaded binary:', err);
    }
  };

  // Add new binary modification patch
  const handleAddPatch = (patchData: Omit<PatchRecord, 'id' | 'timestamp'>) => {
    const newPatch: PatchRecord = {
      ...patchData,
      id: `patch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now()
    };

    setCurrentBinary(prev => ({
      ...prev,
      patches: [...prev.patches.filter(p => p.offset !== patchData.offset), newPatch]
    }));
  };

  // Toggle patch applied/disabled
  const handleTogglePatch = (patchId: string) => {
    setCurrentBinary(prev => ({
      ...prev,
      patches: prev.patches.map(p => p.id === patchId ? { ...p, applied: !p.applied } : p)
    }));
  };

  // Delete patch
  const handleDeletePatch = (patchId: string) => {
    setCurrentBinary(prev => ({
      ...prev,
      patches: prev.patches.filter(p => p.id !== patchId)
    }));
  };

  // Toggle Breakpoint
  const handleToggleBreakpoint = (address: number) => {
    setBreakpoints(prev => 
      prev.includes(address) ? prev.filter(b => b !== address) : [...prev, address]
    );
    setCpuState(prev => ({
      ...prev,
      breakpoints: prev.breakpoints.includes(address) 
        ? prev.breakpoints.filter(b => b !== address) 
        : [...prev.breakpoints, address]
    }));
  };

  // Update AI Decompilation in function
  const handleUpdateFunctionAI = (
    functionId: string,
    aiPseudocode: string,
    aiExplanation: string,
    variables: any[],
    securityNotes: string
  ) => {
    const updated = {
      ...selectedFunction,
      aiPseudocode,
      aiExplanation,
      variables,
      securityNotes
    };
    setSelectedFunction(updated);

    setCurrentBinary(prev => ({
      ...prev,
      functions: prev.functions.map(f => f.id === functionId ? updated : f)
    }));
  };

  // Jump navigators
  const handleJumpToDebugger = (address: number) => {
    setCpuState(prev => ({ ...prev, pc: address }));
    setActiveTab('debugger');
  };

  const handleJumpToHex = (offset: number) => {
    setHexJumpOffset(offset);
    setActiveTab('hex');
  };

  const handleJumpToDisassembly = (address: number) => {
    // Find function containing this address
    const targetFn = currentBinary.functions.find(f => address >= f.startAddress && address <= f.endAddress);
    if (targetFn) {
      setSelectedFunction(targetFn);
    }
    setActiveTab('disassembly');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-mono selection:bg-white selection:text-black">
      
      {/* Top Main Navigation Bar */}
      <Navbar
        currentBinary={currentBinary}
        onSelectBinary={handleSelectBinary}
        onFileUpload={handleFileUpload}
        onOpenRecompiler={() => setIsRecompilerOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        patchCount={currentBinary.patches.filter(p => p.applied).length}
      />

      {/* Main Workspace View Container */}
      <main className="flex-1 p-3 sm:p-4 max-w-[1500px] w-full mx-auto">
        {activeTab === 'overview' && (
          <BinaryOverview
            binary={currentBinary}
            onNavigateTab={setActiveTab}
            onOpenRecompiler={() => setIsRecompilerOpen(true)}
          />
        )}

        {activeTab === 'disassembly' && (
          <DisassemblyView
            binary={currentBinary}
            selectedFunction={selectedFunction}
            onSelectFunction={setSelectedFunction}
            onAddPatch={handleAddPatch}
            onJumpToDebugger={handleJumpToDebugger}
            onJumpToHex={handleJumpToHex}
            breakpoints={breakpoints}
            onToggleBreakpoint={handleToggleBreakpoint}
          />
        )}

        {activeTab === 'pseudocode' && (
          <PseudocodeView
            binary={currentBinary}
            selectedFunction={selectedFunction}
            onUpdateFunctionAI={handleUpdateFunctionAI}
          />
        )}

        {activeTab === 'cfg' && (
          <ControlFlowGraph
            selectedFunction={selectedFunction}
            onSelectInstruction={handleJumpToDebugger}
          />
        )}

        {activeTab === 'debugger' && (
          <DebuggerConsole
            binary={currentBinary}
            cpuState={cpuState}
            onUpdateCpuState={setCpuState}
            instructions={selectedFunction.instructions}
            onToggleBreakpoint={handleToggleBreakpoint}
          />
        )}

        {activeTab === 'hex' && (
          <HexEditor
            binary={currentBinary}
            onAddPatch={handleAddPatch}
            initialOffset={hexJumpOffset}
          />
        )}

        {activeTab === 'injector' && (
          <FeatureInjector
            binary={currentBinary}
            onAddPatch={handleAddPatch}
            onTogglePatch={handleTogglePatch}
            onDeletePatch={handleDeletePatch}
            onOpenRecompiler={() => setIsRecompilerOpen(true)}
          />
        )}

        {activeTab === 'symbols' && (
          <StringsSymbolsTable
            binary={currentBinary}
            onJumpToDisassembly={handleJumpToDisassembly}
            onJumpToHex={handleJumpToHex}
          />
        )}
      </main>

      {/* Recompiler & Export Modal */}
      <RecompilerModal
        binary={currentBinary}
        isOpen={isRecompilerOpen}
        onClose={() => setIsRecompilerOpen(false)}
      />

    </div>
  );
}
