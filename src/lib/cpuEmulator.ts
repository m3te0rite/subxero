import { CpuState, DisassembledInstruction, Architecture, StackEntry, ConsoleLogEntry } from '../types/binary';

// Create initial CPU state
export function createInitialCpuState(arch: Architecture, entryPoint: number): CpuState {
  const initialRegisters: Record<string, number> = arch === 'aarch64' || arch === 'arm32' ? {
    x0: 0,
    x1: 0x7fff5fbff800,
    x2: 0,
    x3: 0,
    x4: 0,
    x5: 0,
    x6: 0,
    x7: 0,
    x8: 0,
    x29: 0x7fff5fbff7e0, // FP
    x30: 0x100003f00, // LR
    sp: 0x7fff5fbff7e0,
    pc: entryPoint
  } : {
    rax: 0,
    rbx: 0,
    rcx: 0x7fffffffe000,
    rdx: 0x7fffffffe010,
    rsi: 0x7fffffffe050, // argv
    rdi: 2, // argc (simulate 2 arguments)
    rbp: 0x7fffffffe080,
    rsp: 0x7fffffffe060,
    rip: entryPoint,
    r8: 0,
    r9: 0,
    r10: 0,
    r11: 0x246,
    r12: 0,
    r13: 0,
    r14: 0,
    r15: 0
  };

  const initialStack: StackEntry[] = [
    { address: 0x7fffffffe088, value: 0x00401010, hexValue: '0x00401010', symbol: '__libc_start_main+240' },
    { address: 0x7fffffffe080, value: 0x7fffffffe090, hexValue: '0x7fffffffe090', symbol: 'saved_rbp', isFramePointer: true },
    { address: 0x7fffffffe078, value: 0x00000002, hexValue: '0x00000002', symbol: 'argc' },
    { address: 0x7fffffffe070, value: 0x7fffffffe050, hexValue: '0x7fffffffe050', symbol: 'argv[0] ("./tool")' },
    { address: 0x7fffffffe068, value: 0x7fffffffe058, hexValue: '0x7fffffffe058', symbol: 'argv[1] ("KEY-9981-PRO")' },
    { address: 0x7fffffffe060, value: 0x00000000, hexValue: '0x00000000', symbol: 'local_var', isStackPointer: true }
  ];

  return {
    architecture: arch,
    registers: initialRegisters,
    flags: { zf: false, cf: false, sf: false, of: false, pf: false },
    pc: entryPoint,
    status: 'paused',
    stepCount: 0,
    breakpoints: [],
    callStack: [
      { functionName: 'main', address: entryPoint, returnAddress: 0x00401010, framePointer: 0x7fffffffe080 }
    ],
    stack: initialStack
  };
}

// Execute single instruction step
export function stepCpu(state: CpuState, instructions: DisassembledInstruction[]): { nextState: CpuState; log?: ConsoleLogEntry } {
  const currentInst = instructions.find(i => i.address === state.pc);
  if (!currentInst) {
    // Reached end or unknown address
    const nextState: CpuState = {
      ...state,
      status: 'halted',
      lastError: `No instruction found at address 0x${state.pc.toString(16)}`
    };
    return {
      nextState,
      log: {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'warn',
        text: `CPU Halted: Program counter 0x${state.pc.toString(16)} outside loaded function scope.`
      }
    };
  }

  const newRegs = { ...state.registers };
  const newFlags = { ...state.flags };
  let newPc = state.pc;
  let logText = `0x${state.pc.toString(16)}: ${currentInst.mnemonic} ${currentInst.operands}`;
  let logType: ConsoleLogEntry['type'] = 'info';

  const mnem = currentInst.mnemonic.toLowerCase();
  const ops = currentInst.operands.toLowerCase();

  // Simple instruction semantics engine
  if (mnem === 'push') {
    newRegs.rsp = (newRegs.rsp || 0x7fffffffe060) - 8;
    logText += ` -> pushed to stack [RSP=0x${newRegs.rsp.toString(16)}]`;
  } else if (mnem === 'pop') {
    newRegs.rsp = (newRegs.rsp || 0x7fffffffe060) + 8;
    logText += ` -> popped from stack [RSP=0x${newRegs.rsp.toString(16)}]`;
  } else if (mnem === 'mov') {
    const parts = ops.split(',').map(s => s.trim());
    if (parts[0] === 'eax' || parts[0] === 'rax' || parts[0] === 'w0' || parts[0] === 'x0') {
      const val = parseInt(parts[1], 16) || parseInt(parts[1], 10) || 0;
      if (state.architecture === 'aarch64') {
        newRegs.x0 = val;
      } else {
        newRegs.rax = val;
      }
      logText += ` -> RAX/X0 = 0x${val.toString(16)}`;
    }
  } else if (mnem === 'xor') {
    if (ops.includes('eax, eax') || ops.includes('rax, rax')) {
      newRegs.rax = 0;
      newFlags.zf = true;
      newFlags.sf = false;
      logText += ` -> RAX zeroed, ZF=1`;
    } else if (ops.includes('0x13371337')) {
      newRegs.rax = ((newRegs.rax || 0) ^ 0x13371337) >>> 0;
      logText += ` -> RAX XORed = 0x${newRegs.rax.toString(16)}`;
    }
  } else if (mnem === 'cmp' || mnem === 'test') {
    const parts = ops.split(',').map(s => s.trim());
    if (parts[0] === 'eax' || parts[0] === 'rax') {
      const val = parseInt(parts[1], 16) || parseInt(parts[1], 10) || 0;
      const res = (newRegs.rax || 0) - val;
      newFlags.zf = res === 0;
      newFlags.sf = res < 0;
      logText += ` -> EFLAGS updated: ZF=${newFlags.zf ? 1 : 0}, SF=${newFlags.sf ? 1 : 0}`;
    } else if (mnem === 'test' && parts[0] === 'eax' && parts[1] === 'eax') {
      const isZero = (newRegs.rax || 0) === 0;
      newFlags.zf = isZero;
      newFlags.sf = false;
      logText += ` -> TEST eax: ZF=${newFlags.zf ? 1 : 0} (${newFlags.zf ? 'ZERO' : 'NON-ZERO'})`;
    }
  } else if (mnem === 'nop') {
    logText += ` -> No operation (NOP sled)`;
  }

  // Branch evaluation
  let branched = false;
  if (currentInst.isConditionalJump && currentInst.branchTarget) {
    if (mnem === 'jnz' || mnem === 'b.ne') {
      if (!newFlags.zf) {
        newPc = currentInst.branchTarget;
        branched = true;
        logText += ` -> [TAKEN] JNZ to 0x${newPc.toString(16)}`;
      } else {
        logText += ` -> [NOT TAKEN] JNZ fell through`;
      }
    } else if (mnem === 'jz' || mnem === 'b.eq') {
      if (newFlags.zf) {
        newPc = currentInst.branchTarget;
        branched = true;
        logText += ` -> [TAKEN] JZ to 0x${newPc.toString(16)}`;
      } else {
        logText += ` -> [NOT TAKEN] JZ fell through`;
      }
    } else if (mnem === 'jg' || mnem === 'b.gt') {
      if (!newFlags.zf && !newFlags.sf) {
        newPc = currentInst.branchTarget;
        branched = true;
        logText += ` -> [TAKEN] JG to 0x${newPc.toString(16)}`;
      } else {
        logText += ` -> [NOT TAKEN] JG fell through`;
      }
    }
  } else if (currentInst.isJump && currentInst.branchTarget) {
    newPc = currentInst.branchTarget;
    branched = true;
    logText += ` -> Unconditional JMP to 0x${newPc.toString(16)}`;
  } else if (currentInst.isCall && currentInst.branchTarget) {
    newPc = currentInst.branchTarget;
    branched = true;
    logText += ` -> CALL ${currentInst.operands} at 0x${newPc.toString(16)}`;
    logType = 'success';
  } else if (currentInst.isReturn) {
    logText += ` -> RET: Subroutine completed with RAX=0x${(newRegs.rax || 0).toString(16)}`;
    logType = 'success';
    // Halt or return to caller
    const nextState: CpuState = {
      ...state,
      registers: newRegs,
      flags: newFlags,
      pc: newPc,
      status: 'halted',
      stepCount: state.stepCount + 1
    };
    return {
      nextState,
      log: {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'success',
        text: `Function returned with code ${newRegs.rax ?? 0}. Execution halted.`
      }
    };
  }

  if (!branched) {
    // Move to next sequential instruction
    const currentIndex = instructions.findIndex(i => i.address === state.pc);
    if (currentIndex >= 0 && currentIndex + 1 < instructions.length) {
      newPc = instructions[currentIndex + 1].address;
    } else {
      newPc = state.pc + (currentInst.hexBytes.split(' ').length || 4);
    }
  }

  // Update PC in registers
  if (state.architecture === 'aarch64') {
    newRegs.pc = newPc;
  } else {
    newRegs.rip = newPc;
  }

  // Check if hit breakpoint
  const hitBreakpoint = state.breakpoints.includes(newPc);
  const nextStatus = hitBreakpoint ? 'breakpoint' : 'step';

  const nextState: CpuState = {
    ...state,
    registers: newRegs,
    flags: newFlags,
    previousPc: state.pc,
    pc: newPc,
    stepCount: state.stepCount + 1,
    status: nextStatus
  };

  return {
    nextState,
    log: {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: hitBreakpoint ? 'warn' : logType,
      text: hitBreakpoint ? `[!] Breakpoint hit at 0x${newPc.toString(16)} | ${logText}` : logText,
      address: state.pc
    }
  };
}

// Execute debugger console command string (like GDB / LLDB / Radare2)
export function evaluateConsoleCommand(
  cmd: string,
  state: CpuState,
  instructions: DisassembledInstruction[]
): { nextState: CpuState; output: string; outputType: ConsoleLogEntry['type'] } {
  const trimmed = cmd.trim();
  const parts = trimmed.split(/\s+/);
  const action = parts[0]?.toLowerCase();

  if (!action || action === 'help') {
    return {
      nextState: state,
      output: `BinaryCraft Debugger Console Commands:
  step / s / si       - Step one instruction into
  next / n / ni       - Step over current instruction
  continue / c / run  - Run execution until breakpoint or exit
  reset / r           - Reset CPU registers and stack to entry point
  break <addr> / b    - Toggle breakpoint (e.g. 'break 0x401157')
  info break / ib     - List active breakpoints
  info registers / reg- Dump all CPU register values
  print <reg/expr>    - Print register or evaluation (e.g. 'print $rax')
  set <reg>=<val>     - Alter register value (e.g. 'set $rax=1' or 'set $zf=1')
  disas / pd          - Disassemble current instruction window
  x/16xb <addr>       - Examine 16 hex bytes at virtual memory address`,
      outputType: 'info'
    };
  }

  if (action === 'step' || action === 's' || action === 'si') {
    const { nextState, log } = stepCpu(state, instructions);
    return {
      nextState,
      output: log?.text || 'Stepped 1 instruction.',
      outputType: log?.type || 'info'
    };
  }

  if (action === 'reset' || action === 'r') {
    const entry = instructions[0]?.address || state.pc;
    const nextState = createInitialCpuState(state.architecture, entry);
    return {
      nextState,
      output: `CPU state and stack reset to entry point 0x${entry.toString(16)}.`,
      outputType: 'success'
    };
  }

  if (action === 'break' || action === 'b') {
    const targetAddrStr = parts[1];
    if (!targetAddrStr) {
      return { nextState: state, output: `Usage: break <hex_address> (e.g. break 0x${state.pc.toString(16)})`, outputType: 'warn' };
    }
    const addr = parseInt(targetAddrStr, 16);
    if (isNaN(addr)) {
      return { nextState: state, output: `Invalid address: "${targetAddrStr}"`, outputType: 'error' };
    }
    const exists = state.breakpoints.includes(addr);
    const newBps = exists ? state.breakpoints.filter(b => b !== addr) : [...state.breakpoints, addr];
    return {
      nextState: { ...state, breakpoints: newBps },
      output: exists ? `Removed breakpoint at 0x${addr.toString(16)}.` : `Added breakpoint #${newBps.length} at 0x${addr.toString(16)}.`,
      outputType: 'success'
    };
  }

  if (action === 'info' && (parts[1] === 'reg' || parts[1] === 'registers' || parts[1] === 'r')) {
    const lines = Object.entries(state.registers).map(([k, v]) => `  ${k.toUpperCase().padEnd(6)} = 0x${v.toString(16).padStart(16, '0')} (${v})`);
    lines.push(`  FLAGS  = [ZF:${state.flags.zf ? 1 : 0} CF:${state.flags.cf ? 1 : 0} SF:${state.flags.sf ? 1 : 0} OF:${state.flags.of ? 1 : 0}]`);
    return {
      nextState: state,
      output: `Register Dump (${state.architecture}):\n${lines.join('\n')}`,
      outputType: 'info'
    };
  }

  if (action === 'info' && (parts[1] === 'break' || parts[1] === 'b' || parts[1] === 'breakpoints')) {
    if (state.breakpoints.length === 0) {
      return { nextState: state, output: 'No breakpoints set.', outputType: 'info' };
    }
    const list = state.breakpoints.map((b, i) => `  #${i + 1} at 0x${b.toString(16)}`);
    return { nextState: state, output: `Active Breakpoints (${state.breakpoints.length}):\n${list.join('\n')}`, outputType: 'info' };
  }

  if (action === 'print' || action === 'p') {
    const target = parts[1]?.replace('$', '')?.toLowerCase();
    if (!target) return { nextState: state, output: 'Usage: print $rax or print $zf', outputType: 'warn' };
    if (target in state.registers) {
      const val = state.registers[target];
      return { nextState: state, output: `$${target} = 0x${val.toString(16)} (${val})`, outputType: 'info' };
    }
    if (target in state.flags) {
      const flagVal = state.flags[target as keyof typeof state.flags];
      return { nextState: state, output: `$${target} = ${flagVal ? 1 : 0}`, outputType: 'info' };
    }
    return { nextState: state, output: `Unknown symbol or register: $${target}`, outputType: 'error' };
  }

  if (action === 'set') {
    const expr = parts.slice(1).join('');
    const [regNameRaw, valRaw] = expr.split('=');
    const regName = regNameRaw?.replace('$', '')?.trim()?.toLowerCase();
    const val = parseInt(valRaw?.trim(), 16) || parseInt(valRaw?.trim(), 10) || 0;

    if (regName in state.registers) {
      const newRegs = { ...state.registers, [regName]: val };
      return {
        nextState: { ...state, registers: newRegs },
        output: `Set $${regName} = 0x${val.toString(16)} (${val}).`,
        outputType: 'success'
      };
    }
    if (regName in state.flags) {
      const newFlags = { ...state.flags, [regName]: Boolean(val) };
      return {
        nextState: { ...state, flags: newFlags },
        output: `Set flag $${regName} = ${val ? 1 : 0}.`,
        outputType: 'success'
      };
    }
    return { nextState: state, output: `Cannot set unknown register "${regName}"`, outputType: 'error' };
  }

  if (action === 'disas' || action === 'pd') {
    const currentIdx = instructions.findIndex(i => i.address === state.pc);
    const windowStart = Math.max(0, currentIdx - 2);
    const windowInsts = instructions.slice(windowStart, windowStart + 8);
    const lines = windowInsts.map(i => {
      const isCur = i.address === state.pc ? '=> ' : '   ';
      const bp = state.breakpoints.includes(i.address) ? '[B]' : '   ';
      return `${isCur}${bp} 0x${i.address.toString(16)}: ${i.mnemonic.padEnd(8)} ${i.operands}`;
    });
    return {
      nextState: state,
      output: lines.join('\n'),
      outputType: 'info'
    };
  }

  return {
    nextState: state,
    output: `Unknown command "${cmd}". Type 'help' for debugger commands.`,
    outputType: 'warn'
  };
}
