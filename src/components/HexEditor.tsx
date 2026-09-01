import React, { useState, useMemo } from 'react';
import { BinaryFile, PatchRecord } from '../types/binary';
import { 
  Search, 
  Database, 
  Eye,
  Edit3
} from 'lucide-react';

interface HexEditorProps {
  binary: BinaryFile;
  onAddPatch: (patch: Omit<PatchRecord, 'id' | 'timestamp'>) => void;
  initialOffset?: number;
}

export const HexEditor: React.FC<HexEditorProps> = ({
  binary,
  onAddPatch,
  initialOffset = 0
}) => {
  const [selectedOffset, setSelectedOffset] = useState<number>(initialOffset);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingByteOffset, setEditingByteOffset] = useState<number | null>(null);
  const [newByteHex, setNewByteHex] = useState('');
  const [pageOffset, setPageOffset] = useState<number>(0);
  const PAGE_SIZE = 512; // 512 bytes per page for smooth rendering

  // Build patched byte array view
  const rawBytes = useMemo(() => {
    const bytes = new Uint8Array(binary.rawBytes);
    for (const patch of binary.patches) {
      if (!patch.applied) continue;
      for (let i = 0; i < patch.patchedBytes.length; i++) {
        if (patch.offset + i < bytes.length) {
          bytes[patch.offset + i] = patch.patchedBytes[i];
        }
      }
    }
    return bytes;
  }, [binary.rawBytes, binary.patches]);

  // Generate 16-byte rows for the current page
  const rows = useMemo(() => {
    const rowList: { offset: number; bytes: number[]; ascii: string }[] = [];
    const start = pageOffset;
    const end = Math.min(rawBytes.length, start + PAGE_SIZE);

    for (let offset = start; offset < end; offset += 16) {
      const rowBytes: number[] = [];
      let ascii = '';
      for (let i = 0; i < 16; i++) {
        if (offset + i < rawBytes.length) {
          const b = rawBytes[offset + i];
          rowBytes.push(b);
          ascii += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
        }
      }
      rowList.push({ offset, bytes: rowBytes, ascii });
    }
    return rowList;
  }, [rawBytes, pageOffset]);

  // Jump to section offset
  const handleJumpSection = (secOffset: number) => {
    const targetPage = Math.floor(secOffset / PAGE_SIZE) * PAGE_SIZE;
    setPageOffset(targetPage);
    setSelectedOffset(secOffset);
  };

  // Inspect data types at selected offset
  const inspectedData = useMemo(() => {
    if (selectedOffset < 0 || selectedOffset >= rawBytes.length) return null;
    const view = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);

    const u8 = rawBytes[selectedOffset];
    const i8 = (u8 << 24) >> 24;
    const binStr = u8.toString(2).padStart(8, '0');

    let u16 = 0, i16 = 0, u32 = 0, i32 = 0;
    if (selectedOffset + 2 <= rawBytes.length) {
      u16 = view.getUint16(selectedOffset, true);
      i16 = view.getInt16(selectedOffset, true);
    }
    if (selectedOffset + 4 <= rawBytes.length) {
      u32 = view.getUint32(selectedOffset, true);
      i32 = view.getInt32(selectedOffset, true);
    }

    return { u8, i8, binStr, u16, i16, u32, i32 };
  }, [rawBytes, selectedOffset]);

  // Apply single byte edit
  const handleSaveByteEdit = (offset: number) => {
    const clean = newByteHex.replace(/[^0-9a-fA-F]/g, '');
    if (clean.length === 0) {
      setEditingByteOffset(null);
      return;
    }
    const val = parseInt(clean.substring(0, 2), 16);
    const origByte = binary.rawBytes[offset] || 0;

    onAddPatch({
      address: binary.baseAddress + offset,
      offset: offset,
      originalBytes: [origByte],
      patchedBytes: [val],
      originalHex: origByte.toString(16).padStart(2, '0').toUpperCase(),
      patchedHex: val.toString(16).padStart(2, '0').toUpperCase(),
      description: `HEX MOD: RAW 0x${offset.toString(16).toUpperCase()} (${origByte.toString(16).toUpperCase()} -> ${val.toString(16).toUpperCase()})`,
      applied: true
    });

    setEditingByteOffset(null);
    setNewByteHex('');
  };

  // Search hex or string
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const searchStr = searchQuery.trim();
    let foundOffset = -1;

    // Search ASCII
    const strBytes: number[] = [];
    for (let i = 0; i < searchStr.length; i++) {
      strBytes.push(searchStr.charCodeAt(i));
    }
    for (let i = 0; i <= rawBytes.length - strBytes.length; i++) {
      let match = true;
      for (let j = 0; j < strBytes.length; j++) {
        if (rawBytes[i + j] !== strBytes[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        foundOffset = i;
        break;
      }
    }

    if (foundOffset !== -1) {
      handleJumpSection(foundOffset);
    }
  };

  return (
    <div className="max-w-[1500px] mx-auto space-y-3 font-mono">
      
      {/* Top Toolbar */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Section Jump */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Database className="w-4 h-4 text-white" />
          <span className="text-[10px] font-bold text-[#555555] uppercase tracking-wider">JUMP TO SECTION:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {binary.sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => handleJumpSection(sec.rawOffset)}
                className="px-2 py-0.5 text-[10px] font-mono bg-black hover:bg-white hover:text-black text-[#999999] border border-[#2a2a2a] transition uppercase"
              >
                {sec.name} (0x{sec.rawOffset.toString(16).toUpperCase()})
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="SEARCH ASCII / HEX..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black text-xs text-white pl-8 pr-2.5 py-1 border border-[#2a2a2a] focus:border-white focus:outline-none font-mono w-48 uppercase text-[11px]"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 bg-white text-black hover:bg-[#999999] text-xs font-bold transition uppercase"
          >
            FIND
          </button>
        </form>

      </div>

      {/* Hex Editor Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        
        {/* Hex View Column (3 Cols) */}
        <div className="lg:col-span-3 bg-black border border-[#2a2a2a] p-3 font-mono text-xs flex flex-col h-[650px]">
          
          {/* Header Row */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#2a2a2a] text-[#555555] text-[10px] select-none uppercase tracking-wider">
            <div className="w-24 font-bold">OFFSET</div>
            <div className="flex-1 grid grid-cols-16 gap-1 text-center font-bold">
              {['00','01','02','03','04','05','06','07','08','09','0A','0B','0C','0D','0E','0F'].map(h => (
                <span key={h}>{h}</span>
              ))}
            </div>
            <div className="w-40 text-center font-bold">ASCII DECODED</div>
          </div>

          {/* Hex Lines Scroll List */}
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 font-mono text-xs">
            {rows.map((row) => (
              <div key={row.offset} className="flex items-center justify-between hover:bg-[#0a0a0a] py-0.5 px-1 transition">
                
                {/* Offset */}
                <span className="w-24 text-[#555555] font-bold select-none text-[11px]">
                  {row.offset.toString(16).padStart(8, '0').toUpperCase()}
                </span>

                {/* 16 Hex Bytes */}
                <div className="flex-1 grid grid-cols-16 gap-1 text-center">
                  {row.bytes.map((b, colIdx) => {
                    const byteOffset = row.offset + colIdx;
                    const isSelected = selectedOffset === byteOffset;
                    const isEditing = editingByteOffset === byteOffset;
                    const isPatched = binary.patches.some(p => p.offset === byteOffset && p.applied);

                    if (isEditing) {
                      return (
                        <input
                          key={colIdx}
                          type="text"
                          maxLength={2}
                          value={newByteHex}
                          onChange={(e) => setNewByteHex(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveByteEdit(byteOffset);
                            if (e.key === 'Escape') setEditingByteOffset(null);
                          }}
                          autoFocus
                          className="w-full bg-white text-black font-bold text-center border-none outline-none text-xs"
                        />
                      );
                    }

                    return (
                      <span
                        key={colIdx}
                        onClick={() => setSelectedOffset(byteOffset)}
                        onDoubleClick={() => {
                          setEditingByteOffset(byteOffset);
                          setNewByteHex(b.toString(16).padStart(2, '0'));
                        }}
                        className={`cursor-pointer transition font-mono ${
                          isPatched 
                            ? 'bg-[#222222] border border-white text-white font-bold' 
                            : (isSelected ? 'bg-white text-black font-bold' : (b === 0 ? 'text-[#333333]' : 'text-[#999999] hover:text-white'))
                        }`}
                        title={`Offset: 0x${byteOffset.toString(16).toUpperCase()} | Value: 0x${b.toString(16).toUpperCase()} [Double-click to edit]`}
                      >
                        {b.toString(16).padStart(2, '0').toUpperCase()}
                      </span>
                    );
                  })}
                </div>

                {/* ASCII Column */}
                <div className="w-40 text-left pl-3 text-[#555555] tracking-wider truncate font-mono select-none text-[11px]">
                  {row.ascii}
                </div>

              </div>
            ))}
          </div>

          {/* Pagination Navigation */}
          <div className="mt-2 pt-2 border-t border-[#2a2a2a] flex items-center justify-between text-[10px] text-[#555555] uppercase">
            <span>BYTES 0x{pageOffset.toString(16).toUpperCase()} - 0x{Math.min(binary.size, pageOffset + PAGE_SIZE).toString(16).toUpperCase()} // TOTAL {binary.size} BYTES</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPageOffset(p => Math.max(0, p - PAGE_SIZE))}
                disabled={pageOffset === 0}
                className="px-2 py-0.5 bg-[#0a0a0a] hover:bg-white hover:text-black disabled:opacity-30 text-[#999999] border border-[#2a2a2a] uppercase font-bold"
              >
                PREV PAGE
              </button>
              <button
                onClick={() => setPageOffset(p => Math.min(binary.size - PAGE_SIZE, p + PAGE_SIZE))}
                disabled={pageOffset + PAGE_SIZE >= binary.size}
                className="px-2 py-0.5 bg-[#0a0a0a] hover:bg-white hover:text-black disabled:opacity-30 text-[#999999] border border-[#2a2a2a] uppercase font-bold"
              >
                NEXT PAGE
              </button>
            </div>
          </div>

        </div>

        {/* Right Sidebar: Data Inspector */}
        <div className="space-y-3">
          
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 font-mono text-xs space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#2a2a2a]">
              <span className="font-bold text-white flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <Eye className="w-3.5 h-3.5 text-white" />
                DATA INSPECTOR
              </span>
              <span className="text-[#999999] text-[10px]">0x{selectedOffset.toString(16).toUpperCase()}</span>
            </div>

            {inspectedData ? (
              <div className="space-y-1.5 text-[10px] uppercase">
                <div className="flex justify-between py-0.5 border-b border-[#1a1a1a]">
                  <span className="text-[#555555]">BINARY (8-BIT):</span>
                  <span className="text-white font-bold">{inspectedData.binStr}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#1a1a1a]">
                  <span className="text-[#555555]">UNSIGNED 8-BIT:</span>
                  <span className="text-white">{inspectedData.u8}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#1a1a1a]">
                  <span className="text-[#555555]">SIGNED 8-BIT:</span>
                  <span className="text-white">{inspectedData.i8}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#1a1a1a]">
                  <span className="text-[#555555]">UINT16 (LE):</span>
                  <span className="text-white">{inspectedData.u16}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#1a1a1a]">
                  <span className="text-[#555555]">INT16 (LE):</span>
                  <span className="text-white">{inspectedData.i16}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#1a1a1a]">
                  <span className="text-[#555555]">UINT32 (LE):</span>
                  <span className="text-white">{inspectedData.u32}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#555555]">HEX VALUE:</span>
                  <span className="text-white font-bold">0x{inspectedData.u8.toString(16).toUpperCase().padStart(2, '0')}</span>
                </div>
              </div>
            ) : (
              <p className="text-[#555555] text-center py-4 uppercase text-[10px]">Select byte to inspect</p>
            )}
          </div>

          {/* Quick Tip Box */}
          <div className="bg-black border border-[#2a2a2a] p-3 text-[10px] text-[#555555] space-y-1 uppercase">
            <h5 className="font-bold text-white flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-white" />
              DIRECT HEX MUTATION
            </h5>
            <p className="text-[#999999] leading-relaxed">
              Double-click any byte to patch. Changes are immediately applied and ready for recompilation.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

