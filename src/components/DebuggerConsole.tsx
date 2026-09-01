import React, { useState, useEffect, useRef } from 'react';
import { BinaryFile, CpuState, ConsoleLogEntry, DisassembledInstruction } from '../types/binary';
import { stepCpu, evaluateConsoleCommand, createInitialCpuState } from '../lib/cpuEmulator';
import { 
  Play, 
  Pause, 
  StepForward, 
  RotateCcw, 
  Terminal, 
  Cpu, 
  Layers, 
  Flag, 
  Check, 
  Edit3, 
  Trash2
} from 'lucide-react';

interface DebuggerConsoleProps {
  binary: BinaryFile;
  cpuState: CpuState;
  onUpdateCpuState: (newState: CpuState) => void;
  instructions: DisassembledInstruction[];
  onToggleBreakpoint: (address: number) => void;
}

export const DebuggerConsole: React.FC<DebuggerConsoleProps> = ({
  binary,
  cpuState,
  onUpdateCpuState,
  instructions
}) => {
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([
    {
      id: 'init_1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      text: `subxero GDB/LLDB EMULATOR INITIALIZED // ${binary.name.toUpperCase()} [${binary.architecture.toUpperCase()}].`
    },
    {
      id: 'init_2',
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      text: `LOADED ENTRY POINT 0x${cpuState.pc.toString(16).toUpperCase()}. TYPE 'help' OR CLICK STEP TO BEGIN EMULATION.`
    }
  ]);

  const [cmdInput, setCmdInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editingReg, setEditingReg] = useState<string | null>(null);
  const [regInputValue, setRegInputValue] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runSpeedMs, setRunSpeedMs] = useState(400);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  // Continuous execution timer
  useEffect(() => {
    let timer: any;
    if (isRunning && cpuState.status !== 'halted') {
      timer = setTimeout(() => {
        handleStep();
      }, runSpeedMs);
    } else if (cpuState.status === 'halted' || cpuState.status === 'breakpoint') {
      setIsRunning(false);
    }
    return () => clearTimeout(timer);
  }, [isRunning, cpuState.pc, cpuState.status]);

  // Step instruction
  const handleStep = () => {
    const { nextState, log } = stepCpu(cpuState, instructions);
    onUpdateCpuState(nextState);
    if (log) {
      setConsoleLogs(prev => [...prev.slice(-150), log]);
    }
  };

  // Reset execution
  const handleReset = () => {
    setIsRunning(false);
    const resetState = createInitialCpuState(binary.architecture, binary.entryPoint);
    onUpdateCpuState(resetState);
    setConsoleLogs(prev => [
      ...prev,
      {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        text: `CPU REGISTERS, STACK, AND IP RESET TO 0x${binary.entryPoint.toString(16).toUpperCase()}.`
      }
    ]);
  };

  // Run command from REPL input
  const handleSendCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = cmdInput.trim();
    if (!cmd) return;

    // Add user command to log
    const userLog: ConsoleLogEntry = {
      id: `cmd_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'cmd',
      text: `(gdb) ${cmd}`
    };

    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    const { nextState, output, outputType } = evaluateConsoleCommand(cmd, cpuState, instructions);
    onUpdateCpuState(nextState);

    const outputLog: ConsoleLogEntry = {
      id: `res_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: outputType,
      text: output
    };

    setConsoleLogs(prev => [...prev.slice(-150), userLog, outputLog]);
    setCmdInput('');
  };

  // Keyboard navigation for command history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setCmdInput(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < commandHistory.length) {
          setHistoryIndex(nextIdx);
          setCmdInput(commandHistory[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setCmdInput('');
        }
      }
    }
  };

  // Alter register value directly
  const handleSaveRegister = (regKey: string) => {
    const val = parseInt(regInputValue, 16) || parseInt(regInputValue, 10) || 0;
    const newRegs = { ...cpuState.registers, [regKey]: val };
    onUpdateCpuState({ ...cpuState, registers: newRegs });
    setEditingReg(null);
    setConsoleLogs(prev => [
      ...prev,
      {
        id: `reg_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'success',
        text: `ALTERED REGISTER $${regKey.toUpperCase()} = 0x${val.toString(16).toUpperCase()} (${val})`
      }
    ]);
  };

  // Toggle CPU flag
  const handleToggleFlag = (flagKey: keyof typeof cpuState.flags) => {
    const newFlags = { ...cpuState.flags, [flagKey]: !cpuState.flags[flagKey] };
    onUpdateCpuState({ ...cpuState, flags: newFlags });
    setConsoleLogs(prev => [
      ...prev,
      {
        id: `flag_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        text: `TOGGLED FLAG $${String(flagKey).toUpperCase()} = ${newFlags[flagKey] ? 1 : 0}`
      }
    ]);
  };

  return (
    <div className="max-w-[1500px] mx-auto space-y-3 font-mono">
      
      {/* Top Debugger Controls Bar */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* State Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 ${
              isRunning ? 'bg-white animate-ping' : (cpuState.status === 'halted' ? 'bg-[#555555]' : 'bg-white')
            }`}></span>
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              STATUS: {isRunning ? 'RUNNING' : cpuState.status.toUpperCase()}
            </span>
          </div>

          <span className="text-[10px] font-mono text-[#999999] bg-black px-2 py-0.5 border border-[#2a2a2a] uppercase">
            PC: <strong className="text-white">0x{cpuState.pc.toString(16).toUpperCase()}</strong>
          </span>

          <span className="text-[10px] font-mono text-[#555555] hidden sm:inline uppercase">
            STEPS: <strong className="text-[#999999]">{cpuState.stepCount}</strong>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* Step Button */}
          <button
            onClick={handleStep}
            disabled={isRunning || cpuState.status === 'halted'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#999999] disabled:opacity-30 text-black font-bold text-xs transition uppercase tracking-wider cursor-pointer"
          >
            <StepForward className="w-3 h-3 text-black" />
            <span>STEP (F7)</span>
          </button>

          {/* Run / Pause Button */}
          <button
            onClick={() => setIsRunning(!isRunning)}
            disabled={cpuState.status === 'halted'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition uppercase tracking-wider ${
              isRunning 
                ? 'bg-white text-black' 
                : 'bg-[#111111] hover:bg-[#222222] text-white border border-[#2a2a2a]'
            }`}
          >
            {isRunning ? <Pause className="w-3 h-3 text-black" /> : <Play className="w-3 h-3 text-white" />}
            <span>{isRunning ? 'PAUSE' : 'CONTINUE (F5)'}</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-[#111111] text-xs font-bold text-[#999999] hover:text-white border border-[#2a2a2a] transition uppercase"
          >
            <RotateCcw className="w-3 h-3 text-[#999999]" />
            <span>RESET CPU</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#2a2a2a] text-[10px] text-[#555555] font-mono uppercase">
            <span>SPEED:</span>
            <select
              value={runSpeedMs}
              onChange={(e) => setRunSpeedMs(Number(e.target.value))}
              className="bg-black text-white px-2 py-0.5 border border-[#2a2a2a] text-[10px] uppercase font-mono"
            >
              <option value={800}>0.5X SLOW</option>
              <option value={400}>1X NORMAL</option>
              <option value={100}>5X FAST</option>
              <option value={20}>20X TURBO</option>
            </select>
          </div>
        </div>

      </div>

      {/* Main Debugger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Left Column: CPU Registers & Status Flags */}
        <div className="space-y-3">
          
          {/* Registers Panel */}
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#2a2a2a]">
              <span className="font-bold text-white flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <Cpu className="w-3.5 h-3.5 text-white" />
                CPU REGISTERS ({binary.architecture.toUpperCase()})
              </span>
              <span className="text-[9px] text-[#555555] uppercase">[CLICK TO ALTER]</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(cpuState.registers).map(([reg, val]) => {
                const isEditing = editingReg === reg;
                const isPC = reg === 'rip' || reg === 'pc';
                const numericVal = Number(val) || 0;

                return (
                  <div 
                    key={reg}
                    className={`p-2 bg-black border transition ${
                      isPC ? 'border-white bg-[#111111]' : 'border-[#2a2a2a] hover:border-[#555555]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#555555] mb-0.5">
                      <span className="font-bold text-white">{reg.toUpperCase()}</span>
                      <button
                        onClick={() => {
                          setEditingReg(reg);
                          setRegInputValue('0x' + numericVal.toString(16));
                        }}
                        className="text-[#555555] hover:text-white"
                        title="Edit value"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="text"
                          value={regInputValue}
                          onChange={(e) => setRegInputValue(e.target.value)}
                          className="w-full bg-white text-[10px] text-black px-1 py-0.5 font-bold font-mono outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRegister(reg);
                            if (e.key === 'Escape') setEditingReg(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveRegister(reg)}
                          className="p-1 bg-white text-black hover:bg-[#999999]"
                        >
                          <Check className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-bold block truncate ${
                        isPC ? 'text-white' : 'text-[#999999]'
                      }`}>
                        0x{numericVal.toString(16).toUpperCase().padStart(8, '0')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* EFLAGS Status Flags Panel */}
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#2a2a2a]">
              <span className="font-bold text-white flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <Flag className="w-3.5 h-3.5 text-white" />
                CONDITION FLAGS (EFLAGS / NZCV)
              </span>
              <span className="text-[9px] text-[#555555] uppercase">[TOGGLEABLE]</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              {[
                { key: 'zf', label: 'ZF', desc: 'Zero result' },
                { key: 'cf', label: 'CF', desc: 'Unsigned overflow' },
                { key: 'sf', label: 'SF', desc: 'Negative result' },
                { key: 'of', label: 'OF', desc: 'Signed overflow' }
              ].map((flag) => {
                const isActive = Boolean(cpuState.flags[flag.key as keyof typeof cpuState.flags]);
                return (
                  <button
                    key={flag.key}
                    onClick={() => handleToggleFlag(flag.key as keyof typeof cpuState.flags)}
                    className={`p-1.5 border text-[10px] font-bold transition cursor-pointer uppercase ${
                      isActive 
                        ? 'bg-white text-black border-white' 
                        : 'bg-black text-[#555555] border-[#2a2a2a] hover:border-[#555555]'
                    }`}
                    title={flag.desc}
                  >
                    <div>{flag.key.toUpperCase()}</div>
                    <div className="text-[9px] mt-0.5">{isActive ? '1' : '0'}</div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right 2 Columns: Stack Memory & Interactive Terminal Console */}
        <div className="lg:col-span-2 space-y-3 flex flex-col">
          
          {/* Stack Visualizer */}
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#2a2a2a]">
              <span className="font-bold text-white flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <Layers className="w-3.5 h-3.5 text-white" />
                VIRTUAL STACK FRAMES [RSP / RBP]
              </span>
              <span className="text-[10px] text-[#555555] uppercase">
                TOP: 0x{(cpuState.registers.rsp || 0x7fffffffe060).toString(16).toUpperCase()}
              </span>
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto">
              {cpuState.stack.map((entry, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-1 text-[10px] ${
                    entry.isStackPointer 
                      ? 'bg-white text-black font-bold' 
                      : (entry.isFramePointer ? 'bg-[#1a1a1a] border border-[#555555] text-white' : 'bg-black text-[#999999]')
                  }`}
                >
                  <span className="w-36 font-mono">0x{entry.address.toString(16).toUpperCase()}</span>
                  <span className="font-bold w-32">{entry.hexValue}</span>
                  <span className="flex-1 truncate text-right uppercase text-[9px]">{entry.symbol || 'STACK_OFFSET'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GDB / LLDB Interactive Debugger Terminal REPL */}
          <div className="bg-black border border-[#2a2a2a] p-3 font-mono text-xs flex-1 flex flex-col min-h-[380px]">
            
            {/* Terminal Header */}
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#2a2a2a] text-[#555555]">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-white" />
                <span className="font-bold text-white text-[10px] uppercase tracking-wider">GDB / LLDB DEBUGGER INTERACTIVE CONSOLE</span>
              </div>
              <div className="flex items-center gap-2 text-[9px]">
                <span className="text-[#555555] uppercase">HISTORY: ↑ / ↓</span>
                <button
                  onClick={() => setConsoleLogs([])}
                  className="p-1 hover:bg-[#111111] text-[#555555] hover:text-white"
                  title="Clear Console"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Terminal Output Log Window */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[10px] leading-relaxed select-text">
              {consoleLogs.map((log) => {
                let colorClass = 'text-[#999999]';
                if (log.type === 'cmd') colorClass = 'text-white font-bold';
                else if (log.type === 'success') colorClass = 'text-white';
                else if (log.type === 'warn') colorClass = 'text-[#999999]';
                else if (log.type === 'error') colorClass = 'text-white font-bold';

                return (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-[#555555] select-none">[{log.timestamp}]</span>
                    <span className={`whitespace-pre-wrap ${colorClass}`}>{log.text}</span>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>

            {/* Terminal Input Prompt */}
            <form onSubmit={handleSendCommand} className="mt-2 pt-2 border-t border-[#2a2a2a] flex items-center gap-2">
              <span className="text-white font-bold select-none text-[11px]">(gdb)</span>
              <input
                type="text"
                value={cmdInput}
                onChange={(e) => setCmdInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="COMMAND: 'step', 'break 0x401157', 'print $rax', 'set $rax=1', 'help'..."
                className="flex-1 bg-transparent text-white text-[11px] focus:outline-none font-mono placeholder:text-[#333333]"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-white text-black hover:bg-[#999999] text-[10px] font-bold uppercase"
              >
                EXEC
              </button>
            </form>

          </div>

        </div>

      </div>

    </div>
  );
};

