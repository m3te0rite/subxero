import { BinaryFile, DecompiledFunction, CFGNode, CFGEdge } from '../types/binary';

// Helper to generate sample byte arrays
function makeSampleBytes(length: number, pattern: number[]): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = pattern[i % pattern.length] ^ ((i * 37) & 0xff);
  }
  return bytes;
}

// 1. Linux x86_64 ELF
const elfFunctions: DecompiledFunction[] = [
  {
    id: 'fn_main',
    name: 'main',
    signature: 'int main(int argc, char **argv)',
    startAddress: 0x00401120,
    endAddress: 0x004011a0,
    size: 128,
    cyclomaticComplexity: 4,
    callers: ['_start'],
    callees: ['validate_license', 'init_network_socket', 'printf', 'exit'],
    instructions: [
      { address: 0x00401120, hexBytes: '55', mnemonic: 'push', operands: 'rbp', comment: 'Save base pointer' },
      { address: 0x00401121, hexBytes: '48 89 e5', mnemonic: 'mov', operands: 'rbp, rsp', comment: 'Setup stack frame' },
      { address: 0x00401124, hexBytes: '48 83 ec 20', mnemonic: 'sub', operands: 'rsp, 0x20', comment: 'Allocate 32 bytes local frame' },
      { address: 0x00401128, hexBytes: '89 7d ec', mnemonic: 'mov', operands: 'dword [rbp-0x14], edi', comment: 'argc' },
      { address: 0x0040112b, hexBytes: '48 89 75 e0', mnemonic: 'mov', operands: 'qword [rbp-0x20], rsi', comment: 'argv' },
      { address: 0x0040112f, hexBytes: '83 7d ec 01', mnemonic: 'cmp', operands: 'dword [rbp-0x14], 1', comment: 'Check if key argument passed' },
      { address: 0x00401133, hexBytes: '7f 13', mnemonic: 'jg', operands: '0x00401148', isConditionalJump: true, branchTarget: 0x00401148 },
      { address: 0x00401135, hexBytes: '48 8d 3d a4 0e 00 00', mnemonic: 'lea', operands: 'rdi, [str_usage]', comment: '"Usage: ./auth_validator <license_key>"' },
      { address: 0x0040113c, hexBytes: 'e8 5f 01 00 00', mnemonic: 'call', operands: 'puts', isCall: true, branchTarget: 0x004012a0 },
      { address: 0x00401141, hexBytes: 'b8 01 00 00 00', mnemonic: 'mov', operands: 'eax, 1' },
      { address: 0x00401146, hexBytes: 'eb 4b', mnemonic: 'jmp', operands: '0x00401193', isJump: true, branchTarget: 0x00401193 },
      { address: 0x00401148, hexBytes: '48 8b 45 e0', mnemonic: 'mov', operands: 'rax, qword [rbp-0x20]' },
      { address: 0x0040114c, hexBytes: '48 8b 78 08', mnemonic: 'mov', operands: 'rdi, qword [rax+8]', comment: 'argv[1] (license key string)' },
      { address: 0x00401150, hexBytes: 'e8 5b 00 00 00', mnemonic: 'call', operands: 'validate_license', isCall: true, branchTarget: 0x004011b0 },
      { address: 0x00401155, hexBytes: '85 c0', mnemonic: 'test', operands: 'eax, eax', comment: 'Test validation result' },
      { address: 0x00401157, hexBytes: '75 1a', mnemonic: 'jnz', operands: '0x00401173', isConditionalJump: true, branchTarget: 0x00401173, comment: 'Branch: Success if eax != 0' },
      { address: 0x00401159, hexBytes: '48 8d 3d 90 0e 00 00', mnemonic: 'lea', operands: 'rdi, [str_invalid]', comment: '"[!] LICENSE KEY INVALID - ACCESS DENIED"' },
      { address: 0x00401160, hexBytes: 'e8 3b 01 00 00', mnemonic: 'call', operands: 'puts', isCall: true },
      { address: 0x00401165, hexBytes: 'b8 01 00 00 00', mnemonic: 'mov', operands: 'eax, 1' },
      { address: 0x0040116a, hexBytes: 'c9', mnemonic: 'leave' },
      { address: 0x0040116b, hexBytes: 'c3', mnemonic: 'ret', isReturn: true },
      { address: 0x00401173, hexBytes: '48 8d 3d 96 0e 00 00', mnemonic: 'lea', operands: 'rdi, [str_success]', comment: '"[+] LICENSE GRANTED: PRO ACCESS ACTIVATED"' },
      { address: 0x0040117a, hexBytes: 'e8 21 01 00 00', mnemonic: 'call', operands: 'puts', isCall: true },
      { address: 0x0040117f, hexBytes: 'e8 8c 00 00 00', mnemonic: 'call', operands: 'init_network_socket', isCall: true, branchTarget: 0x00401210 },
      { address: 0x00401184, hexBytes: 'b8 00 00 00 00', mnemonic: 'mov', operands: 'eax, 0' },
      { address: 0x00401189, hexBytes: '48 83 c4 20', mnemonic: 'add', operands: 'rsp, 0x20' },
      { address: 0x0040118d, hexBytes: '5d', mnemonic: 'pop', operands: 'rbp' },
      { address: 0x0040118e, hexBytes: 'c3', mnemonic: 'ret', isReturn: true },
      { address: 0x00401193, hexBytes: 'c9', mnemonic: 'leave' },
      { address: 0x00401194, hexBytes: 'c3', mnemonic: 'ret', isReturn: true }
    ],
    blocks: [
      {
        id: 'block_0',
        name: 'loc_entry',
        functionId: 'fn_main',
        startAddress: 0x00401120,
        endAddress: 0x00401133,
        x: 280,
        y: 30,
        width: 320,
        height: 180,
        outEdges: ['edge_0_1', 'edge_0_2'],
        inEdges: [],
        instructions: []
      },
      {
        id: 'block_1',
        name: 'loc_no_args',
        functionId: 'fn_main',
        startAddress: 0x00401135,
        endAddress: 0x00401146,
        x: 80,
        y: 260,
        width: 280,
        height: 130,
        outEdges: ['edge_1_exit'],
        inEdges: ['edge_0_1'],
        instructions: []
      },
      {
        id: 'block_2',
        name: 'loc_validate',
        functionId: 'fn_main',
        startAddress: 0x00401148,
        endAddress: 0x00401157,
        x: 480,
        y: 260,
        width: 300,
        height: 140,
        outEdges: ['edge_2_fail', 'edge_2_ok'],
        inEdges: ['edge_0_2'],
        instructions: []
      },
      {
        id: 'block_3',
        name: 'loc_denied',
        functionId: 'fn_main',
        startAddress: 0x00401159,
        endAddress: 0x0040116b,
        x: 350,
        y: 450,
        width: 270,
        height: 140,
        outEdges: [],
        inEdges: ['edge_2_fail'],
        instructions: []
      },
      {
        id: 'block_4',
        name: 'loc_granted',
        functionId: 'fn_main',
        startAddress: 0x00401173,
        endAddress: 0x0040118e,
        x: 670,
        y: 450,
        width: 300,
        height: 150,
        outEdges: [],
        inEdges: ['edge_2_ok'],
        instructions: []
      }
    ],
    edges: [
      { id: 'edge_0_1', from: 'block_0', to: 'block_1', type: 'false', label: 'argc <= 1' },
      { id: 'edge_0_2', from: 'block_0', to: 'block_2', type: 'true', label: 'argc > 1' },
      { id: 'edge_1_exit', from: 'block_1', to: 'block_3', type: 'unconditional', label: 'exit' },
      { id: 'edge_2_fail', from: 'block_2', to: 'block_3', type: 'false', label: 'eax == 0 (invalid)' },
      { id: 'edge_2_ok', from: 'block_2', to: 'block_4', type: 'true', label: 'eax != 0 (valid)' }
    ],
    pseudocode: `int32_t main(int32_t argc, char **argv) {
    if (argc <= 1) {
        puts("Usage: ./auth_validator <license_key>");
        return 1;
    }

    char *license_input = argv[1];
    int32_t is_valid = validate_license(license_input);

    if (is_valid == 0) {
        puts("[!] LICENSE KEY INVALID - ACCESS DENIED");
        return 1;
    }

    puts("[+] LICENSE GRANTED: PRO ACCESS ACTIVATED");
    init_network_socket();
    return 0;
}`,
    variables: [
      { original: 'rbp-0x14', suggested: 'argc', type: 'int32_t', description: 'Command line argument count' },
      { original: 'rbp-0x20', suggested: 'argv', type: 'char**', description: 'Command line argument array' },
      { original: 'eax', suggested: 'validation_status', type: 'int32_t', description: 'Return flag from license check (1=OK, 0=Fail)' }
    ],
    securityNotes: 'Direct branch at 0x00401157 (jnz 0x401173) can be patched with 2x NOP (0x9090) or JMP to bypass auth entirely.'
  },
  {
    id: 'fn_validate_license',
    name: 'validate_license',
    signature: 'int validate_license(const char *key)',
    startAddress: 0x004011b0,
    endAddress: 0x00401205,
    size: 85,
    cyclomaticComplexity: 5,
    callers: ['main'],
    callees: ['strlen', 'crc32_calc'],
    instructions: [
      { address: 0x004011b0, hexBytes: '55', mnemonic: 'push', operands: 'rbp' },
      { address: 0x004011b1, hexBytes: '48 89 e5', mnemonic: 'mov', operands: 'rbp, rsp' },
      { address: 0x004011b4, hexBytes: '48 83 ec 18', mnemonic: 'sub', operands: 'rsp, 0x18' },
      { address: 0x004011b8, hexBytes: '48 89 7d f8', mnemonic: 'mov', operands: 'qword [rbp-8], rdi' },
      { address: 0x004011bc, hexBytes: 'e8 e0 00 00 00', mnemonic: 'call', operands: 'strlen', isCall: true },
      { address: 0x004011c1, hexBytes: '48 83 f8 13', mnemonic: 'cmp', operands: 'rax, 19', comment: 'Check key length == 19 (e.g. XXXX-XXXX-XXXX-XXXX)' },
      { address: 0x004011c5, hexBytes: '75 2a', mnemonic: 'jne', operands: '0x004011f1', isConditionalJump: true, branchTarget: 0x004011f1 },
      { address: 0x004011c7, hexBytes: '48 8b 7d f8', mnemonic: 'mov', operands: 'rdi, qword [rbp-8]' },
      { address: 0x004011cb, hexBytes: 'e8 50 01 00 00', mnemonic: 'call', operands: 'crc32_calc', isCall: true },
      { address: 0x004011d0, hexBytes: '81 f0 37 13 37 13', mnemonic: 'xor', operands: 'eax, 0x13371337', comment: 'De-obfuscate master magic' },
      { address: 0x004011d6, hexBytes: '3d de ad be ef', mnemonic: 'cmp', operands: 'eax, 0xefbeadde', comment: 'Compare expected checksum' },
      { address: 0x004011db, hexBytes: '75 14', mnemonic: 'jne', operands: '0x004011f1', isConditionalJump: true },
      { address: 0x004011dd, hexBytes: 'b8 01 00 00 00', mnemonic: 'mov', operands: 'eax, 1', comment: 'Return SUCCESS (1)' },
      { address: 0x004011e2, hexBytes: 'c9', mnemonic: 'leave' },
      { address: 0x004011e3, hexBytes: 'c3', mnemonic: 'ret', isReturn: true },
      { address: 0x004011f1, hexBytes: '31 c0', mnemonic: 'xor', operands: 'eax, eax', comment: 'Return FAILURE (0)' },
      { address: 0x004011f3, hexBytes: 'c9', mnemonic: 'leave' },
      { address: 0x004011f4, hexBytes: 'c3', mnemonic: 'ret', isReturn: true }
    ],
    blocks: [
      {
        id: 'val_b0',
        name: 'check_len',
        functionId: 'fn_validate_license',
        startAddress: 0x004011b0,
        endAddress: 0x004011c5,
        x: 300,
        y: 30,
        width: 300,
        height: 140,
        outEdges: ['val_e0_ok', 'val_e0_fail'],
        inEdges: [],
        instructions: []
      },
      {
        id: 'val_b1',
        name: 'check_hash',
        functionId: 'fn_validate_license',
        startAddress: 0x004011c7,
        endAddress: 0x004011db,
        x: 480,
        y: 220,
        width: 320,
        height: 150,
        outEdges: ['val_e1_ok', 'val_e1_fail'],
        inEdges: ['val_e0_ok'],
        instructions: []
      },
      {
        id: 'val_b2',
        name: 'val_success',
        functionId: 'fn_validate_license',
        startAddress: 0x004011dd,
        endAddress: 0x004011e3,
        x: 650,
        y: 420,
        width: 220,
        height: 100,
        outEdges: [],
        inEdges: ['val_e1_ok'],
        instructions: []
      },
      {
        id: 'val_b3',
        name: 'val_fail',
        functionId: 'fn_validate_license',
        startAddress: 0x004011f1,
        endAddress: 0x004011f4,
        x: 200,
        y: 420,
        width: 220,
        height: 100,
        outEdges: [],
        inEdges: ['val_e0_fail', 'val_e1_fail'],
        instructions: []
      }
    ],
    edges: [
      { id: 'val_e0_ok', from: 'val_b0', to: 'val_b1', type: 'true', label: 'len == 19' },
      { id: 'val_e0_fail', from: 'val_b0', to: 'val_b3', type: 'false', label: 'len != 19' },
      { id: 'val_e1_ok', from: 'val_b1', to: 'val_b2', type: 'true', label: 'crc ^ 0x13371337 == 0xefbeadde' },
      { id: 'val_e1_fail', from: 'val_b1', to: 'val_b3', type: 'false', label: 'hash mismatch' }
    ],
    pseudocode: `int32_t validate_license(const char *license_str) {
    if (license_str == NULL) {
        return 0;
    }
    
    size_t length = strlen(license_str);
    if (length != 19) {
        return 0; // Invalid token length
    }
    
    uint32_t computed_crc = crc32_calc(license_str, 19);
    uint32_t token_checksum = computed_crc ^ 0x13371337;
    
    if (token_checksum == 0xEFBEADDE) {
        return 1; // Valid license
    }
    
    return 0; // Validation failed
}`,
    variables: [
      { original: 'rdi', suggested: 'license_str', type: 'const char*', description: 'Input serial string' },
      { original: 'rax', suggested: 'length', type: 'size_t', description: 'String length' },
      { original: 'eax', suggested: 'token_checksum', type: 'uint32_t', description: 'Obfuscated hash check' }
    ],
    securityNotes: 'Hardcoded magic constant 0xEFBEADDE and simple XOR cipher. Can be patched with return 1 in first byte.'
  },
  {
    id: 'fn_init_socket',
    name: 'init_network_socket',
    signature: 'int init_network_socket(void)',
    startAddress: 0x00401210,
    endAddress: 0x00401270,
    size: 96,
    cyclomaticComplexity: 2,
    callers: ['main'],
    callees: ['socket', 'bind', 'listen', 'printf'],
    instructions: [
      { address: 0x00401210, hexBytes: '55', mnemonic: 'push', operands: 'rbp' },
      { address: 0x00401211, hexBytes: '48 89 e5', mnemonic: 'mov', operands: 'rbp, rsp' },
      { address: 0x00401214, hexBytes: 'bf 02 00 00 00', mnemonic: 'mov', operands: 'edi, 2', comment: 'AF_INET' },
      { address: 0x00401219, hexBytes: 'be 01 00 00 00', mnemonic: 'mov', operands: 'esi, 1', comment: 'SOCK_STREAM' },
      { address: 0x0040121e, hexBytes: 'ba 00 00 00 00', mnemonic: 'mov', operands: 'edx, 0' },
      { address: 0x00401223, hexBytes: 'e8 80 00 00 00', mnemonic: 'call', operands: 'socket', isCall: true },
      { address: 0x00401228, hexBytes: '89 45 fc', mnemonic: 'mov', operands: 'dword [rbp-4], eax', comment: 'sockfd' },
      { address: 0x0040122b, hexBytes: '48 8d 3d 50 0e 00 00', mnemonic: 'lea', operands: 'rdi, [str_listening]', comment: '"[+] Service listening on port 8080..."' },
      { address: 0x00401232, hexBytes: 'e8 69 00 00 00', mnemonic: 'call', operands: 'puts', isCall: true },
      { address: 0x00401237, hexBytes: 'b8 00 00 00 00', mnemonic: 'mov', operands: 'eax, 0' },
      { address: 0x0040123c, hexBytes: 'c9', mnemonic: 'leave' },
      { address: 0x0040123d, hexBytes: 'c3', mnemonic: 'ret', isReturn: true }
    ],
    blocks: [],
    edges: [],
    pseudocode: `int32_t init_network_socket(void) {
    int32_t sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd < 0) {
        perror("socket creation failed");
        return -1;
    }
    
    puts("[+] Service listening on port 8080...");
    return 0;
}`,
    variables: [],
    securityNotes: 'Standard TCP listener initialization.'
  }
];

// 2. ARM64 Mach-O Sample
const arm64Functions: DecompiledFunction[] = [
  {
    id: 'fn_arm_main',
    name: 'main',
    signature: 'int main(int argc, const char *argv[])',
    startAddress: 0x100003f40,
    endAddress: 0x100003fb0,
    size: 112,
    cyclomaticComplexity: 3,
    callers: ['start'],
    callees: ['crypto_verify_enclave', 'printf'],
    instructions: [
      { address: 0x100003f40, hexBytes: 'fd 7b bf a9', mnemonic: 'stp', operands: 'x29, x30, [sp, #-16]!', comment: 'Save Frame Pointer & Link Register' },
      { address: 0x100003f44, hexBytes: 'fd 03 00 91', mnemonic: 'mov', operands: 'x29, sp', comment: 'Set up frame pointer' },
      { address: 0x100003f48, hexBytes: 'ff 43 00 d1', mnemonic: 'sub', operands: 'sp, sp, #16' },
      { address: 0x100003f4c, hexBytes: '00 00 80 52', mnemonic: 'mov', operands: 'w0, #0', comment: 'Param 0: auth mode' },
      { address: 0x100003f50, hexBytes: '01 00 00 94', mnemonic: 'bl', operands: 'crypto_verify_enclave', isCall: true, branchTarget: 0x100003f60 },
      { address: 0x100003f54, hexBytes: '1f 00 00 71', mnemonic: 'cmp', operands: 'w0, #0', comment: 'Check auth status' },
      { address: 0x100003f58, hexBytes: '41 00 00 54', mnemonic: 'b.ne', operands: '0x100003f70', isConditionalJump: true, branchTarget: 0x100003f70 },
      { address: 0x100003f5c, hexBytes: '00 00 80 52', mnemonic: 'mov', operands: 'w0, #0', comment: 'Return 0' },
      { address: 0x100003f60, hexBytes: 'ff 43 00 91', mnemonic: 'add', operands: 'sp, sp, #16' },
      { address: 0x100003f64, hexBytes: 'fd 7b c1 a8', mnemonic: 'ldp', operands: 'x29, x30, [sp], #16' },
      { address: 0x100003f68, hexBytes: 'c0 03 5f d6', mnemonic: 'ret', operands: '', isReturn: true },
      { address: 0x100003f70, hexBytes: '20 00 80 52', mnemonic: 'mov', operands: 'w0, #1', comment: 'Success unlocked' },
      { address: 0x100003f74, hexBytes: 'fd 7b c1 a8', mnemonic: 'ldp', operands: 'x29, x30, [sp], #16' },
      { address: 0x100003f78, hexBytes: 'c0 03 5f d6', mnemonic: 'ret', operands: '', isReturn: true }
    ],
    blocks: [
      {
        id: 'arm_b0',
        name: 'arm_entry',
        functionId: 'fn_arm_main',
        startAddress: 0x100003f40,
        endAddress: 0x100003f58,
        x: 260,
        y: 40,
        width: 320,
        height: 160,
        outEdges: ['arm_e0', 'arm_e1'],
        inEdges: [],
        instructions: []
      },
      {
        id: 'arm_b1',
        name: 'arm_fail',
        functionId: 'fn_arm_main',
        startAddress: 0x100003f5c,
        endAddress: 0x100003f68,
        x: 120,
        y: 260,
        width: 260,
        height: 130,
        outEdges: [],
        inEdges: ['arm_e0'],
        instructions: []
      },
      {
        id: 'arm_b2',
        name: 'arm_success',
        functionId: 'fn_arm_main',
        startAddress: 0x100003f70,
        endAddress: 0x100003f78,
        x: 440,
        y: 260,
        width: 260,
        height: 130,
        outEdges: [],
        inEdges: ['arm_e1'],
        instructions: []
      }
    ],
    edges: [
      { id: 'arm_e0', from: 'arm_b0', to: 'arm_b1', type: 'false', label: 'w0 == 0' },
      { id: 'arm_e1', from: 'arm_b0', to: 'arm_b2', type: 'true', label: 'w0 != 0' }
    ],
    pseudocode: `int32_t main(int32_t argc, const char *argv[]) {
    uint32_t enclave_status = crypto_verify_enclave(0);
    if (enclave_status != 0) {
        printf("[+] Secure Enclave Hardware Lock Opened\\n");
        return 1;
    }
    printf("[-] Enclave Auth Failed\\n");
    return 0;
}`,
    variables: [
      { original: 'w0', suggested: 'enclave_status', type: 'uint32_t', description: 'Enclave unlock status' }
    ]
  }
];

// Sample Binaries Catalog
export const SAMPLE_BINARIES: BinaryFile[] = [
  {
    id: 'sample_elf64_license',
    name: 'auth_validator.elf',
    size: 16428,
    format: 'ELF',
    architecture: 'x86_64',
    bitness: 64,
    endianness: 'LE',
    entryPoint: 0x00401120,
    baseAddress: 0x00400000,
    magic: '7f 45 4c 46 02 01 01 00',
    hashes: {
      md5: '8f7a932b10dc65a4e12f0088921bc641',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    },
    sections: [
      { id: 's1', name: '.text', virtualAddress: 0x00401000, virtualSize: 0x1400, rawOffset: 0x1000, rawSize: 0x1400, permissions: 'r-x', entropy: 6.42, type: 'CODE' },
      { id: 's2', name: '.rodata', virtualAddress: 0x00402400, virtualSize: 0x0800, rawOffset: 0x2400, rawSize: 0x0800, permissions: 'r--', entropy: 4.81, type: 'RODATA' },
      { id: 's3', name: '.data', virtualAddress: 0x00403000, virtualSize: 0x0600, rawOffset: 0x3000, rawSize: 0x0600, permissions: 'rw-', entropy: 3.12, type: 'DATA' },
      { id: 's4', name: '.bss', virtualAddress: 0x00403600, virtualSize: 0x0400, rawOffset: 0x0000, rawSize: 0x0000, permissions: 'rw-', entropy: 0.00, type: 'BSS' },
      { id: 's5', name: '.symtab', virtualAddress: 0x00404000, virtualSize: 0x0900, rawOffset: 0x4000, rawSize: 0x0900, permissions: 'r--', entropy: 5.10, type: 'OTHER' }
    ],
    symbols: [
      { id: 'sym_1', name: 'main', address: 0x00401120, size: 128, type: 'FUNC', section: '.text' },
      { id: 'sym_2', name: 'validate_license', address: 0x004011b0, size: 85, type: 'FUNC', section: '.text' },
      { id: 'sym_3', name: 'init_network_socket', address: 0x00401210, size: 96, type: 'FUNC', section: '.text' },
      { id: 'sym_4', name: 'crc32_calc', address: 0x00401300, size: 140, type: 'FUNC', section: '.text' },
      { id: 'sym_5', name: 'printf', address: 0x00401030, size: 16, type: 'IMPORT', isLibrary: true },
      { id: 'sym_6', name: 'puts', address: 0x00401040, size: 16, type: 'IMPORT', isLibrary: true },
      { id: 'sym_7', name: 'socket', address: 0x00401050, size: 16, type: 'IMPORT', isLibrary: true },
      { id: 'sym_8', name: 'strlen', address: 0x00401060, size: 16, type: 'IMPORT', isLibrary: true }
    ],
    strings: [
      { id: 'str_1', offset: 0x2410, address: 0x00402410, value: 'Usage: ./auth_validator <license_key>', encoding: 'ASCII', section: '.rodata', xrefs: [0x00401135] },
      { id: 'str_2', offset: 0x2440, address: 0x00402440, value: '[!] LICENSE KEY INVALID - ACCESS DENIED', encoding: 'ASCII', section: '.rodata', xrefs: [0x00401159] },
      { id: 'str_3', offset: 0x2470, address: 0x00402470, value: '[+] LICENSE GRANTED: PRO ACCESS ACTIVATED', encoding: 'ASCII', section: '.rodata', xrefs: [0x00401173] },
      { id: 'str_4', offset: 0x24a0, address: 0x004024a0, value: '[+] Service listening on port 8080...', encoding: 'ASCII', section: '.rodata', xrefs: [0x0040122b] },
      { id: 'str_5', offset: 0x24d0, address: 0x004024d0, value: 'AUTH_SALT_v4_KEYGEN_CRC', encoding: 'ASCII', section: '.rodata', xrefs: [0x00401310] }
    ],
    functions: elfFunctions,
    patches: [],
    rawData: makeSampleBytes(16428, [0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x55, 0x48, 0x89, 0xe5, 0x48, 0x83, 0xec, 0x20])
  },
  {
    id: 'sample_macho_arm64',
    name: 'vault_cipher.macho',
    size: 24576,
    format: 'Mach-O',
    architecture: 'aarch64',
    bitness: 64,
    endianness: 'LE',
    entryPoint: 0x100003f40,
    baseAddress: 0x100000000,
    magic: 'cf fa ed fe 0c 00 00 01',
    hashes: {
      md5: '4a6b8c129e4d58872e418491cba04123',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    sections: [
      { id: 'm1', name: '__TEXT.__text', virtualAddress: 0x100003000, virtualSize: 0x2000, rawOffset: 0x3000, rawSize: 0x2000, permissions: 'r-x', entropy: 6.88, type: 'CODE' },
      { id: 'm2', name: '__TEXT.__cstring', virtualAddress: 0x100005000, virtualSize: 0x0a00, rawOffset: 0x5000, rawSize: 0x0a00, permissions: 'r--', entropy: 4.15, type: 'RODATA' },
      { id: 'm3', name: '__DATA.__data', virtualAddress: 0x100006000, virtualSize: 0x0800, rawOffset: 0x6000, rawSize: 0x0800, permissions: 'rw-', entropy: 3.44, type: 'DATA' }
    ],
    symbols: [
      { id: 'sym_arm_1', name: 'main', address: 0x100003f40, size: 112, type: 'FUNC', section: '__TEXT.__text' },
      { id: 'sym_arm_2', name: 'crypto_verify_enclave', address: 0x100004100, size: 160, type: 'FUNC', section: '__TEXT.__text' }
    ],
    strings: [
      { id: 'str_m1', offset: 0x5010, address: 0x100005010, value: '[+] Secure Enclave Hardware Lock Opened', encoding: 'UTF-8', section: '__TEXT.__cstring', xrefs: [0x100003f70] },
      { id: 'str_m2', offset: 0x5040, address: 0x100005040, value: '[-] Enclave Auth Failed', encoding: 'UTF-8', section: '__TEXT.__cstring', xrefs: [0x100003f5c] }
    ],
    functions: arm64Functions,
    patches: [],
    rawData: makeSampleBytes(24576, [0xcf, 0xfa, 0xed, 0xfe, 0x0c, 0x00, 0x00, 0x01, 0xfd, 0x7b, 0xbf, 0xa9, 0xfd, 0x03, 0x00, 0x91])
  },
  {
    id: 'sample_wasm_physics',
    name: 'physics_engine.wasm',
    size: 18920,
    format: 'WASM',
    architecture: 'wasm',
    bitness: 32,
    endianness: 'LE',
    entryPoint: 0x00000080,
    baseAddress: 0x00000000,
    magic: '00 61 73 6d 01 00 00 00',
    hashes: {
      md5: '7110eda4d09e062aa5e4a390b0a572ac',
      sha256: '5d41402abc4b2a76b9719d911017c592ee501309f8742d45c367a78377759d57'
    },
    sections: [
      { id: 'w1', name: 'TypeSection', virtualAddress: 0x00000010, virtualSize: 0x0080, rawOffset: 0x0010, rawSize: 0x0080, permissions: 'r--', entropy: 4.10, type: 'OTHER' },
      { id: 'w2', name: 'FunctionSection', virtualAddress: 0x00000090, virtualSize: 0x0060, rawOffset: 0x0090, rawSize: 0x0060, permissions: 'r--', entropy: 3.80, type: 'OTHER' },
      { id: 'w3', name: 'CodeSection', virtualAddress: 0x00000100, virtualSize: 0x3000, rawOffset: 0x0100, rawSize: 0x3000, permissions: 'r-x', entropy: 5.92, type: 'CODE' },
      { id: 'w4', name: 'ExportSection', virtualAddress: 0x00003100, virtualSize: 0x0200, rawOffset: 0x3100, rawSize: 0x0200, permissions: 'r--', entropy: 4.50, type: 'EXPORT' }
    ],
    symbols: [
      { id: 'w_sym1', name: 'step_simulation', address: 0x00000120, size: 84, type: 'EXPORT' },
      { id: 'w_sym2', name: 'solve_rigid_body_collision', address: 0x00000200, size: 140, type: 'FUNC' },
      { id: 'w_sym3', name: 'calculate_restitution_matrix', address: 0x00000310, size: 110, type: 'FUNC' }
    ],
    strings: [
      { id: 'w_str1', offset: 0x0800, address: 0x00000800, value: 'wasm:collision_overflow_detected', encoding: 'ASCII', section: 'CodeSection', xrefs: [0x00000240] },
      { id: 'w_str2', offset: 0x0840, address: 0x00000840, value: 'wasm:memory_growth_allocated', encoding: 'ASCII', section: 'CodeSection', xrefs: [0x00000180] }
    ],
    functions: [
      {
        id: 'fn_wasm_step',
        name: 'step_simulation',
        signature: 'export function step_simulation(delta_time: f32, body_count: i32): i32',
        startAddress: 0x00000120,
        endAddress: 0x00000174,
        size: 84,
        cyclomaticComplexity: 3,
        callers: ['javascript_runtime'],
        callees: ['solve_rigid_body_collision'],
        instructions: [
          { address: 0x00000120, hexBytes: '20 00', mnemonic: 'local.get', operands: '$param_0', comment: 'Load delta_time' },
          { address: 0x00000122, hexBytes: '43 00 00 00 00', mnemonic: 'f32.const', operands: '0.0' },
          { address: 0x00000127, hexBytes: '5d', mnemonic: 'f32.le', operands: '', comment: 'Check if dt <= 0' },
          { address: 0x00000128, hexBytes: '04 40', mnemonic: 'if (result i32)', operands: '' },
          { address: 0x0000012a, hexBytes: '41 00', mnemonic: 'i32.const', operands: '0' },
          { address: 0x0000012c, hexBytes: '0f', mnemonic: 'return', operands: '', isReturn: true },
          { address: 0x0000012d, hexBytes: '0b', mnemonic: 'end', operands: '' },
          { address: 0x0000012e, hexBytes: '20 01', mnemonic: 'local.get', operands: '$param_1', comment: 'Load body_count' },
          { address: 0x00000130, hexBytes: '10 01', mnemonic: 'call', operands: '$solve_rigid_body_collision', isCall: true, branchTarget: 0x00000200 },
          { address: 0x00000132, hexBytes: '0f', mnemonic: 'return', operands: '', isReturn: true }
        ],
        blocks: [],
        edges: [],
        pseudocode: `export int32_t step_simulation(float delta_time, int32_t body_count) {
    if (delta_time <= 0.0f) {
        return 0; // Skip invalid tick
    }
    
    int32_t active_contacts = solve_rigid_body_collision(delta_time, body_count);
    return active_contacts;
}`,
        variables: [
          { original: '$param_0', suggested: 'delta_time', type: 'float', description: 'Simulation frame delta time' },
          { original: '$param_1', suggested: 'body_count', type: 'int32_t', description: 'Number of active physics bodies' }
        ]
      }
    ],
    patches: [],
    rawData: makeSampleBytes(18920, [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x07, 0x01, 0x60, 0x02, 0x7d, 0x7f, 0x01])
  },
  {
    id: 'sample_pe64_sys',
    name: 'sys_service.exe',
    size: 32768,
    format: 'PE',
    architecture: 'x86_64',
    bitness: 64,
    endianness: 'LE',
    entryPoint: 0x140001000,
    baseAddress: 0x140000000,
    magic: '4d 5a 90 00 03 00 00 00',
    hashes: {
      md5: '3c19b02a118e95c102a902fb345a9012',
      sha256: 'b4c6e2572f42a3cc15e6e00a6012c4e3579b64019a11e2f4d1b827361a9f14e2'
    },
    sections: [
      { id: 'pe1', name: '.text', virtualAddress: 0x140001000, virtualSize: 0x3000, rawOffset: 0x1000, rawSize: 0x3000, permissions: 'r-x', entropy: 6.25, type: 'CODE' },
      { id: 'pe2', name: '.rdata', virtualAddress: 0x140004000, virtualSize: 0x1500, rawOffset: 0x4000, rawSize: 0x1500, permissions: 'r--', entropy: 4.88, type: 'RODATA' },
      { id: 'pe3', name: '.data', virtualAddress: 0x140006000, virtualSize: 0x0a00, rawOffset: 0x6000, rawSize: 0x0a00, permissions: 'rw-', entropy: 2.95, type: 'DATA' },
      { id: 'pe4', name: '.idata', virtualAddress: 0x140007000, virtualSize: 0x0800, rawOffset: 0x7000, rawSize: 0x0800, permissions: 'r--', entropy: 5.20, type: 'IMPORT' }
    ],
    symbols: [
      { id: 'pe_s1', name: 'ServiceMain', address: 0x140001000, size: 90, type: 'FUNC', section: '.text' },
      { id: 'pe_s2', name: 'CheckAdminToken', address: 0x140001080, size: 75, type: 'FUNC', section: '.text' },
      { id: 'pe_s3', name: 'OpenProcessToken', address: 0x140007010, size: 8, type: 'IMPORT', isLibrary: true },
      { id: 'pe_s4', name: 'GetTokenInformation', address: 0x140007020, size: 8, type: 'IMPORT', isLibrary: true }
    ],
    strings: [
      { id: 'pe_str1', offset: 0x4020, address: 0x140004020, value: 'SystemControlDaemonService_v2', encoding: 'UTF-16', section: '.rdata', xrefs: [0x140001010] },
      { id: 'pe_str2', offset: 0x4080, address: 0x140004080, value: 'ADMIN_PRIVILEGE_ELEVATION_GRANTED', encoding: 'ASCII', section: '.rdata', xrefs: [0x1400010a0] }
    ],
    functions: [
      {
        id: 'fn_pe_main',
        name: 'ServiceMain',
        signature: 'int ServiceMain(DWORD dwArgc, LPTSTR *lpszArgv)',
        startAddress: 0x140001000,
        endAddress: 0x14000105a,
        size: 90,
        cyclomaticComplexity: 2,
        callers: ['WinMain'],
        callees: ['CheckAdminToken', 'RegisterServiceCtrlHandlerW'],
        instructions: [
          { address: 0x140001000, hexBytes: '48 83 ec 28', mnemonic: 'sub', operands: 'rsp, 0x28' },
          { address: 0x140001004, hexBytes: 'e8 77 00 00 00', mnemonic: 'call', operands: 'CheckAdminToken', isCall: true, branchTarget: 0x140001080 },
          { address: 0x140001009, hexBytes: '85 c0', mnemonic: 'test', operands: 'eax, eax' },
          { address: 0x14000100b, hexBytes: '74 15', mnemonic: 'jz', operands: '0x140001022', isConditionalJump: true, branchTarget: 0x140001022 },
          { address: 0x14000100d, hexBytes: 'b8 00 00 00 00', mnemonic: 'mov', operands: 'eax, 0' },
          { address: 0x140001012, hexBytes: '48 83 c4 28', mnemonic: 'add', operands: 'rsp, 0x28' },
          { address: 0x140001016, hexBytes: 'c3', mnemonic: 'ret', isReturn: true },
          { address: 0x140001022, hexBytes: 'b8 05 00 00 00', mnemonic: 'mov', operands: 'eax, 5', comment: 'ERROR_ACCESS_DENIED' },
          { address: 0x140001027, hexBytes: '48 83 c4 28', mnemonic: 'add', operands: 'rsp, 0x28' },
          { address: 0x14000102b, hexBytes: 'c3', mnemonic: 'ret', isReturn: true }
        ],
        blocks: [],
        edges: [],
        pseudocode: `int32_t ServiceMain(uint32_t dwArgc, wchar_t **lpszArgv) {
    int32_t is_admin = CheckAdminToken();
    if (is_admin != 0) {
        // Elevated context confirmed
        return 0; // NO_ERROR
    }
    
    return 5; // ERROR_ACCESS_DENIED
}`,
        variables: []
      }
    ],
    patches: [],
    rawData: makeSampleBytes(32768, [0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00])
  }
];
