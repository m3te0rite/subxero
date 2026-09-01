export type Architecture = 'x86_64' | 'x86_32' | 'aarch64' | 'arm32' | 'riscv64' | 'mips32' | 'wasm';

export type BinaryFormat = 'ELF' | 'PE' | 'Mach-O' | 'WASM' | 'RAW' | 'HEX';

export interface BinarySection {
  id: string;
  name: string;
  virtualAddress: number;
  virtualSize: number;
  rawOffset: number;
  rawSize: number;
  permissions: string; // e.g. "r-x", "rw-", "r--"
  entropy: number; // 0.0 to 8.0
  type: 'CODE' | 'DATA' | 'RODATA' | 'BSS' | 'IMPORT' | 'EXPORT' | 'RELOC' | 'OTHER';
}

export interface BinarySymbol {
  id: string;
  name: string;
  demangledName?: string;
  address: number;
  size: number;
  type: 'FUNC' | 'OBJECT' | 'IMPORT' | 'EXPORT' | 'SECTION';
  section?: string;
  isLibrary?: boolean;
}

export interface BinaryString {
  id: string;
  offset: number;
  address: number;
  value: string;
  encoding: 'ASCII' | 'UTF-8' | 'UTF-16';
  section: string;
  xrefs: number[]; // Addresses referencing this string
}

export type ExtractedString = BinaryString;

export interface DisassembledInstruction {
  address: number;
  hexBytes: string;
  mnemonic: string;
  operands?: string;
  comment?: string;
  isJump?: boolean;
  isConditionalJump?: boolean;
  isCall?: boolean;
  isReturn?: boolean;
  isNop?: boolean;
  branchTarget?: number;
  xrefs?: number[];
  blockId?: string;
  functionId?: string;
  isPatched?: boolean;
}

export interface CFGEdge {
  id: string;
  from: string; // blockId
  to: string; // blockId
  type: 'true' | 'false' | 'unconditional' | 'call';
  label?: string;
}

export interface CFGNode {
  id: string;
  name: string;
  functionId: string;
  startAddress: number;
  endAddress: number;
  instructions: DisassembledInstruction[];
  x: number;
  y: number;
  width: number;
  height: number;
  outEdges: string[];
  inEdges: string[];
}

export interface DecompiledVariable {
  original: string;
  suggested: string;
  type: string;
  offset?: string;
  description?: string;
}

export interface DecompiledFunction {
  id: string;
  name: string;
  signature: string;
  startAddress: number;
  endAddress: number;
  size: number;
  cyclomaticComplexity: number;
  blocks: CFGNode[];
  edges: CFGEdge[];
  instructions: DisassembledInstruction[];
  pseudocode: string;
  aiPseudocode?: string;
  aiExplanation?: string;
  variables: DecompiledVariable[];
  securityNotes?: string;
  callers: string[];
  callees: string[];
}

export interface PatchRecord {
  id: string;
  timestamp: number;
  offset: number;
  address: number;
  originalBytes: number[];
  patchedBytes: number[];
  originalHex: string;
  patchedHex: string;
  description: string;
  functionName?: string;
  applied: boolean;
}

export interface BinaryFile {
  id: string;
  name: string;
  size: number;
  format: BinaryFormat;
  architecture: Architecture;
  bitness: 32 | 64;
  endianness: 'LE' | 'BE';
  entryPoint: number;
  baseAddress: number;
  magic: string;
  rawData: Uint8Array;
  hashes: {
    md5: string;
    sha256: string;
  };
  sections: BinarySection[];
  symbols: BinarySymbol[];
  strings: BinaryString[];
  functions: DecompiledFunction[];
  patches: PatchRecord[];
}

export interface CpuRegisters {
  [key: string]: number | bigint;
}

export interface CpuFlags {
  zf: boolean; // Zero Flag
  cf: boolean; // Carry Flag
  sf: boolean; // Sign Flag
  of: boolean; // Overflow Flag
  pf?: boolean; // Parity Flag
  af?: boolean; // Auxiliary Flag
}

export interface StackEntry {
  address: number;
  value: number;
  hexValue: string;
  symbol?: string;
  isFramePointer?: boolean;
  isStackPointer?: boolean;
}

export interface CallStackFrame {
  functionName: string;
  address: number;
  returnAddress: number;
  framePointer: number;
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success' | 'cmd' | 'debug';
  text: string;
  address?: number;
}

export interface CpuState {
  architecture: Architecture;
  registers: Record<string, number>;
  flags: CpuFlags;
  pc: number;
  previousPc?: number;
  status: 'halted' | 'running' | 'paused' | 'step' | 'breakpoint' | 'error';
  stepCount: number;
  breakpoints: number[];
  callStack: CallStackFrame[];
  stack: StackEntry[];
  lastError?: string;
}

export interface RecompileTarget {
  id: string;
  name: string;
  format: BinaryFormat;
  architecture: Architecture;
  extension: string;
  description: string;
  compatibleOS: string[];
}
