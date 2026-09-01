import React, { useState } from 'react';
import { BinaryFile } from '../types/binary';
import { 
  Search, 
  FileText, 
  Layers, 
  Copy, 
  Check, 
  Code
} from 'lucide-react';

interface StringsSymbolsTableProps {
  binary: BinaryFile;
  onJumpToDisassembly?: (address: number) => void;
  onJumpToHex?: (offset: number) => void;
}

export const StringsSymbolsTable: React.FC<StringsSymbolsTableProps> = ({
  binary,
  onJumpToDisassembly
}) => {
  const [activeTab, setActiveTab] = useState<'strings' | 'symbols'>('strings');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredStrings = binary.strings.filter(s => 
    s.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.address.toString(16).includes(searchQuery.toLowerCase())
  );

  const filteredSymbols = binary.symbols.filter(sym =>
    sym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sym.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sym.binding.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="max-w-[1500px] mx-auto space-y-3 font-mono">
      
      {/* Top Toolbar */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('strings')}
            className={`px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 uppercase cursor-pointer ${
              activeTab === 'strings' 
                ? 'bg-white text-black' 
                : 'bg-black text-[#555555] hover:text-white border border-[#2a2a2a]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>EXTRACTED STRINGS ({binary.strings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('symbols')}
            className={`px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 uppercase cursor-pointer ${
              activeTab === 'symbols' 
                ? 'bg-white text-black' 
                : 'bg-black text-[#555555] hover:text-white border border-[#2a2a2a]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SYMBOLS & IMPORTS ({binary.symbols.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder={activeTab === 'strings' ? 'SEARCH STRINGS / ADDRESS...' : 'SEARCH SYMBOLS...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black text-xs text-white pl-8 pr-3 py-1.5 border border-[#2a2a2a] focus:border-white outline-none font-mono w-64 placeholder:text-[#333333] uppercase text-[10px]"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-4 min-h-[500px]">
        {activeTab === 'strings' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-[#555555] uppercase text-[9px]">
                  <th className="pb-2">VIRTUAL ADDRESS</th>
                  <th className="pb-2">RAW OFFSET</th>
                  <th className="pb-2">SECTION</th>
                  <th className="pb-2">LENGTH</th>
                  <th className="pb-2">STRING VALUE</th>
                  <th className="pb-2">XREFS</th>
                  <th className="pb-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {filteredStrings.map((str) => (
                  <tr key={str.id} className="hover:bg-[#111111] transition">
                    <td className="py-2 text-white font-bold">
                      0x{str.address.toString(16).toUpperCase()}
                    </td>
                    <td className="py-2 text-[#555555]">
                      0x{str.offset.toString(16).toUpperCase()}
                    </td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 bg-black text-[9px] text-[#999999] border border-[#2a2a2a] uppercase">
                        {str.section}
                      </span>
                    </td>
                    <td className="py-2 text-[#555555]">{str.length} CHARS</td>
                    <td className="py-2 text-white font-bold max-w-xs truncate" title={str.value}>
                      "{str.value}"
                    </td>
                    <td className="py-2 text-[#999999]">
                      {str.xrefs.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {str.xrefs.map((xref, idx) => (
                            <span 
                              key={idx}
                              onClick={() => onJumpToDisassembly?.(xref)}
                              className="cursor-pointer hover:underline text-white font-bold"
                              title="Jump to instruction"
                            >
                              0x{xref.toString(16).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#333333]">NONE</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleCopy(str.value, str.id)}
                        className="p-1 hover:bg-black text-[#555555] hover:text-white transition"
                        title="Copy string"
                      >
                        {copiedId === str.id ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-[#555555] uppercase text-[9px]">
                  <th className="pb-2">SYMBOL NAME</th>
                  <th className="pb-2">VIRTUAL ADDRESS</th>
                  <th className="pb-2">SIZE</th>
                  <th className="pb-2">TYPE</th>
                  <th className="pb-2">BINDING</th>
                  <th className="pb-2">SECTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {filteredSymbols.map((sym, idx) => (
                  <tr key={idx} className="hover:bg-[#111111] transition">
                    <td className="py-2 font-bold text-white flex items-center gap-1.5">
                      <Code className="w-3 h-3 text-white" />
                      {sym.name}
                    </td>
                    <td className="py-2 text-[#999999] font-bold">
                      0x{sym.address.toString(16).toUpperCase()}
                    </td>
                    <td className="py-2 text-[#555555]">{sym.size} BYTES</td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 bg-black text-[9px] text-[#999999] border border-[#2a2a2a] uppercase">
                        {sym.type}
                      </span>
                    </td>
                    <td className="py-2 text-[#999999] uppercase">{sym.binding}</td>
                    <td className="py-2 text-[#555555] uppercase">{sym.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

