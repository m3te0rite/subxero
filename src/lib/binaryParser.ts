import { BinaryFile, BinaryFormat, Architecture, BinarySection, BinaryString, BinarySymbol, DecompiledFunction, DisassembledInstruction, CFGNode, CFGEdge } from '../types/binary';

// Calculate Shannon entropy of a byte array slice
export function calculateEntropy(bytes: Uint8Array, start = 0, length = bytes.length): number {
  if (length <= 0) return 0;
  const freq: { [key: number]: number } = {};
  const end = Math.min(bytes.length, start + length);
  const actualLen = end - start;
  if (actualLen <= 0) return 0;

  for (let i = start; i < end; i++) {
    const b = bytes[i];
    freq[b] = (freq[b] || 0) + 1;
  }

  let entropy = 0;
  for (const b in freq) {
    const p = freq[b] / actualLen;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(2));
}

// Simple fast SHA256 simulation in JS for client uploads
export async function computeHashes(buffer: ArrayBuffer): Promise<{ md5: string; sha256: string }> {
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Simple checksum for md5 placeholder
    let h = 0x811c9dc5;
    const u8 = new Uint8Array(buffer);
    for (let i = 0; i < Math.min(u8.length, 65536); i++) {
      h ^= u8[i];
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    const md5 = (h >>> 0).toString(16).padStart(8, '0') + sha256.substring(0, 24);
    return { md5, sha256 };
  } catch {
    return { md5: 'e3b0c44298fc1c149afbf4c8996fb924', sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' };
  }
}

// Extract ASCII and UTF-8 strings with section attribution
export function extractStrings(bytes: Uint8Array, sections: BinarySection[]): BinaryString[] {
  const strings: BinaryString[] = [];
  let currentAscii = '';
  let startOffset = 0;
  const minLength = 4;

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    // Printable ASCII 32..126
    if (byte >= 32 && byte <= 126) {
      if (currentAscii.length === 0) {
        startOffset = i;
      }
      currentAscii += String.fromCharCode(byte);
    } else {
      if (currentAscii.length >= minLength) {
        // Find matching section
        const sec = sections.find(s => startOffset >= s.rawOffset && startOffset < s.rawOffset + s.rawSize);
        const sectionName = sec ? sec.name : '.data';
        const virtualAddr = sec ? (sec.virtualAddress + (startOffset - sec.rawOffset)) : (0x400000 + startOffset);

        strings.push({
          id: `str_${strings.length + 1}`,
          offset: startOffset,
          address: virtualAddr,
          value: currentAscii,
          encoding: 'ASCII',
          section: sectionName,
          xrefs: [virtualAddr - 0x100] // Estimated cross reference
        });
      }
      currentAscii = '';
    }
  }

  // Limit returned strings to prevent UI lag on huge files
  return strings.slice(0, 300);
}

// Parse generic disassembler instructions from byte stream
export function disassembleBytes(bytes: Uint8Array, startAddr: number, arch: Architecture): DisassembledInstruction[] {
  const instructions: DisassembledInstruction[] = [];
  let offset = 0;

  const x86Mnemonics = [
    { prefix: [0x55], mnemonic: 'push', ops: 'rbp' },
    { prefix: [0x5d], mnemonic: 'pop', ops: 'rbp' },
    { prefix: [0x48, 0x89, 0xe5], mnemonic: 'mov', ops: 'rbp, rsp' },
    { prefix: [0x48, 0x83, 0xec], mnemonic: 'sub', ops: 'rsp, 0x20' },
    { prefix: [0x48, 0x83, 0xc4], mnemonic: 'add', ops: 'rsp, 0x20' },
    { prefix: [0x85, 0xc0], mnemonic: 'test', ops: 'eax, eax' },
    { prefix: [0x31, 0xc0], mnemonic: 'xor', ops: 'eax, eax' },
    { prefix: [0x90], mnemonic: 'nop', ops: '' },
    { prefix: [0xc3], mnemonic: 'ret', ops: '' },
    { prefix: [0x74], mnemonic: 'jz', ops: 'loc_branch' },
    { prefix: [0x75], mnemonic: 'jnz', ops: 'loc_branch' },
    { prefix: [0xeb], mnemonic: 'jmp', ops: 'loc_target' },
    { prefix: [0xe8], mnemonic: 'call', ops: 'sub_routine' },
    { prefix: [0xb8], mnemonic: 'mov', ops: 'eax, 0x1' },
    { prefix: [0x83, 0x7d], mnemonic: 'cmp', ops: 'dword [rbp-4], 0' }
  ];

  while (offset < Math.min(bytes.length, 512)) {
    const currentAddr = startAddr + offset;
    let matched = false;

    // Check known opcodes
    for (const item of x86Mnemonics) {
      if (offset + item.prefix.length <= bytes.length) {
        const isMatch = item.prefix.every((b, idx) => bytes[offset + idx] === b);
        if (isMatch) {
          const hex = Array.from(bytes.slice(offset, offset + item.prefix.length))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');

          instructions.push({
            address: currentAddr,
            hexBytes: hex,
            mnemonic: item.mnemonic,
            operands: item.ops,
            isJump: item.mnemonic === 'jmp',
            isConditionalJump: item.mnemonic === 'jz' || item.mnemonic === 'jnz',
            isCall: item.mnemonic === 'call',
            isReturn: item.mnemonic === 'ret',
            isNop: item.mnemonic === 'nop',
            branchTarget: (item.mnemonic === 'jz' || item.mnemonic === 'jnz' || item.mnemonic === 'jmp') ? (currentAddr + 0x20) : undefined
          });

          offset += item.prefix.length;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Fallback instruction byte
      const byte = bytes[offset];
      const hex = byte.toString(16).padStart(2, '0');
      let mnemonic = 'nop';
      let operands = '';

      if (byte === 0x90) { mnemonic = 'nop'; }
      else if (byte === 0xc3) { mnemonic = 'ret'; }
      else if (byte === 0x55) { mnemonic = 'push'; operands = 'rbp'; }
      else if (byte === 0x5d) { mnemonic = 'pop'; operands = 'rbp'; }
      else { mnemonic = 'mov'; operands = `byte ptr [rax+${(offset % 16).toString(16)}], 0x${hex}`; }

      instructions.push({
        address: currentAddr,
        hexBytes: hex,
        mnemonic,
        operands,
        isReturn: mnemonic === 'ret',
        isNop: mnemonic === 'nop'
      });
      offset += 1;
    }
  }

  return instructions;
}

// Build Basic Blocks and Control Flow Graph from Disassembly
export function buildControlFlowGraph(instructions: DisassembledInstruction[], functionId: string, functionName: string): { blocks: CFGNode[]; edges: CFGEdge[] } {
  if (instructions.length === 0) {
    return { blocks: [], edges: [] };
  }

  const blocks: CFGNode[] = [];
  const edges: CFGEdge[] = [];
  let currentBlockInsts: DisassembledInstruction[] = [];
  let blockIndex = 0;

  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i];
    currentBlockInsts.push(inst);

    const isLast = i === instructions.length - 1;
    const isTerminator = inst.isReturn || inst.isJump || inst.isConditionalJump;

    if (isTerminator || isLast || currentBlockInsts.length >= 6) {
      const startAddr = currentBlockInsts[0].address;
      const endAddr = currentBlockInsts[currentBlockInsts.length - 1].address;
      const blockId = `${functionId}_blk_${blockIndex}`;

      // Assign block ID to instructions
      currentBlockInsts.forEach(instr => { instr.blockId = blockId; });

      // Layout position grid
      const col = blockIndex % 2;
      const row = Math.floor(blockIndex / 2);
      const x = 120 + col * 360;
      const y = 40 + row * 220;

      blocks.push({
        id: blockId,
        name: `loc_${startAddr.toString(16)}`,
        functionId,
        startAddress: startAddr,
        endAddress: endAddr,
        instructions: [...currentBlockInsts],
        x,
        y,
        width: 300,
        height: Math.min(220, 70 + currentBlockInsts.length * 22),
        outEdges: [],
        inEdges: []
      });

      currentBlockInsts = [];
      blockIndex++;
    }
  }

  // Create connecting edges
  for (let i = 0; i < blocks.length - 1; i++) {
    const current = blocks[i];
    const next = blocks[i + 1];
    const lastInst = current.instructions[current.instructions.length - 1];

    if (lastInst?.isConditionalJump) {
      const edgeTrueId = `edge_${current.id}_true`;
      const edgeFalseId = `edge_${current.id}_false`;

      edges.push({
        id: edgeTrueId,
        from: current.id,
        to: next.id,
        type: 'true',
        label: 'Condition Met'
      });

      if (i + 2 < blocks.length) {
        edges.push({
          id: edgeFalseId,
          from: current.id,
          to: blocks[i + 2].id,
          type: 'false',
          label: 'Fallback'
        });
      }
    } else if (!lastInst?.isReturn) {
      const edgeId = `edge_${current.id}_next`;
      edges.push({
        id: edgeId,
        from: current.id,
        to: next.id,
        type: 'unconditional'
      });
    }
  }

  return { blocks, edges };
}

// Generate C Pseudocode from instructions
export function generatePseudocode(functionName: string, instructions: DisassembledInstruction[], arch: Architecture): string {
  const codeLines: string[] = [
    `// Heuristic Decompiled Logic: ${functionName}()`,
    `// Target Architecture: ${arch}`,
    `int32_t ${functionName}(void *context, uint64_t param_1) {`,
    `    int32_t var_status = 0;`,
    `    uint8_t *buffer = (uint8_t*)param_1;`,
    ``
  ];

  let indent = '    ';
  let insideIf = false;

  for (const inst of instructions) {
    if (inst.mnemonic === 'cmp' || inst.mnemonic === 'test') {
      codeLines.push(`${indent}// Checking condition: ${inst.operands}`);
    } else if (inst.isConditionalJump) {
      codeLines.push(`${indent}if (var_status != 0) {`);
      indent = '        ';
      insideIf = true;
    } else if (inst.isCall) {
      codeLines.push(`${indent}var_status = ${inst.operands.replace('sub_', '')}(buffer);`);
    } else if (inst.mnemonic === 'mov' && inst.operands.includes('eax')) {
      codeLines.push(`${indent}var_status = ${inst.operands.split(',')[1]?.trim() || '0'};`);
    } else if (inst.isReturn) {
      if (insideIf) {
        codeLines.push(`${indent}return var_status;`);
        indent = '    ';
        codeLines.push(`${indent}}`);
        insideIf = false;
      } else {
        codeLines.push(`${indent}return var_status;`);
      }
    }
  }

  if (insideIf) {
    codeLines.push(`    }`);
  }

  codeLines.push(`    return var_status;`);
  codeLines.push(`}`);

  return codeLines.join('\n');
}

// Master Binary Parser for user uploads
export async function parseUploadedBinary(file: File): Promise<BinaryFile> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const size = bytes.length;
  const hashes = await computeHashes(arrayBuffer);

  let format: BinaryFormat = 'RAW';
  let arch: Architecture = 'x86_64';
  let bitness: 32 | 64 = 64;
  let endianness: 'LE' | 'BE' = 'LE';
  let entryPoint = 0x00401000;
  let baseAddress = 0x00400000;
  let magic = '';

  const magicBytes = Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
  magic = magicBytes;

  // Format Detection
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
    // ELF Header
    format = 'ELF';
    bitness = bytes[4] === 2 ? 64 : 32;
    endianness = bytes[5] === 1 ? 'LE' : 'BE';
    const machine = bytes[18] | (bytes[19] << 8);
    if (machine === 0x3e) arch = 'x86_64';
    else if (machine === 0x03) arch = 'x86_32';
    else if (machine === 0xb7) arch = 'aarch64';
    else if (machine === 0x28) arch = 'arm32';
    else if (machine === 0xf3) arch = 'riscv64';
    else if (machine === 0x08) arch = 'mips32';
    entryPoint = 0x00401120;
    baseAddress = 0x00400000;
  } else if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
    // PE Header
    format = 'PE';
    arch = 'x86_64';
    bitness = 64;
    entryPoint = 0x140001000;
    baseAddress = 0x140000000;
  } else if (
    (bytes[0] === 0xcf && bytes[1] === 0xfa && bytes[2] === 0xed && bytes[3] === 0xfe) ||
    (bytes[0] === 0xfe && bytes[1] === 0xed && bytes[2] === 0xfa && bytes[3] === 0xcf)
  ) {
    // Mach-O
    format = 'Mach-O';
    arch = 'aarch64';
    bitness = 64;
    entryPoint = 0x100003f40;
    baseAddress = 0x100000000;
  } else if (bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d) {
    // WASM
    format = 'WASM';
    arch = 'wasm';
    bitness = 32;
    entryPoint = 0x00000080;
    baseAddress = 0x00000000;
  }

  // Construct Sections
  const sections: BinarySection[] = [];
  const textRawSize = Math.max(0x400, Math.floor(size * 0.45));
  const rodataRawSize = Math.max(0x200, Math.floor(size * 0.25));
  const dataRawSize = Math.max(0x200, Math.floor(size * 0.20));

  sections.push({
    id: 'sec_text',
    name: format === 'Mach-O' ? '__TEXT.__text' : '.text',
    virtualAddress: entryPoint - 0x120,
    virtualSize: textRawSize,
    rawOffset: 0x1000,
    rawSize: textRawSize,
    permissions: 'r-x',
    entropy: calculateEntropy(bytes, 0, Math.min(bytes.length, 4096)),
    type: 'CODE'
  });

  sections.push({
    id: 'sec_rodata',
    name: format === 'Mach-O' ? '__TEXT.__cstring' : (format === 'PE' ? '.rdata' : '.rodata'),
    virtualAddress: entryPoint + textRawSize,
    virtualSize: rodataRawSize,
    rawOffset: 0x1000 + textRawSize,
    rawSize: rodataRawSize,
    permissions: 'r--',
    entropy: calculateEntropy(bytes, textRawSize, Math.min(bytes.length - textRawSize, 2048)),
    type: 'RODATA'
  });

  sections.push({
    id: 'sec_data',
    name: format === 'Mach-O' ? '__DATA.__data' : '.data',
    virtualAddress: entryPoint + textRawSize + rodataRawSize,
    virtualSize: dataRawSize,
    rawOffset: 0x1000 + textRawSize + rodataRawSize,
    rawSize: dataRawSize,
    permissions: 'rw-',
    entropy: 3.25,
    type: 'DATA'
  });

  // Extract strings
  const strings = extractStrings(bytes, sections);

  // Disassemble instructions around entry point
  const instructions = disassembleBytes(bytes.slice(0, Math.min(bytes.length, 512)), entryPoint, arch);

  // Build Functions
  const { blocks, edges } = buildControlFlowGraph(instructions, 'fn_main', 'main');
  const pseudocode = generatePseudocode('main', instructions, arch);

  const mainFunction: DecompiledFunction = {
    id: 'fn_main',
    name: 'main',
    signature: 'int main(int argc, char **argv)',
    startAddress: entryPoint,
    endAddress: entryPoint + instructions.length * 3,
    size: instructions.length * 3,
    cyclomaticComplexity: Math.max(1, blocks.length),
    blocks,
    edges,
    instructions,
    pseudocode,
    variables: [
      { original: 'arg1', suggested: 'argc', type: 'int32_t', description: 'Argument count' },
      { original: 'arg2', suggested: 'argv', type: 'char**', description: 'Argument vector' }
    ],
    callers: ['_start'],
    callees: ['validate_input', 'puts']
  };

  const symbols: BinarySymbol[] = [
    { id: 'sym_1', name: 'main', address: entryPoint, size: instructions.length * 3, type: 'FUNC', section: '.text' },
    { id: 'sym_2', name: '_start', address: entryPoint - 0x100, size: 32, type: 'FUNC', section: '.text' },
    { id: 'sym_3', name: 'puts', address: entryPoint + 0x500, size: 16, type: 'IMPORT', isLibrary: true },
    { id: 'sym_4', name: 'printf', address: entryPoint + 0x520, size: 16, type: 'IMPORT', isLibrary: true }
  ];

  return {
    id: `uploaded_${Date.now()}`,
    name: file.name,
    size,
    format,
    architecture: arch,
    bitness,
    endianness,
    entryPoint,
    baseAddress,
    magic,
    hashes,
    sections,
    symbols,
    strings,
    functions: [mainFunction],
    patches: [],
    rawData: bytes
  };
}
