import React, { useRef } from 'react';
import { BinaryFile, Architecture, BinaryFormat } from '../types/binary';
import { SAMPLE_BINARIES } from '../data/sampleBinaries';
import { 
  Binary, 
  Upload, 
  DownloadCloud, 
  FolderOpen
} from 'lucide-react';

interface NavbarProps {
  currentBinary: BinaryFile;
  onSelectBinary: (binary: BinaryFile) => void;
  onFileUpload: (file: File) => void;
  onOpenRecompiler: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  patchCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentBinary,
  onSelectBinary,
  onFileUpload,
  onOpenRecompiler,
  activeTab,
  setActiveTab,
  patchCount
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <header className="bg-black border-b border-[#2a2a2a] sticky top-0 z-40 px-4 py-2.5 font-mono">
      <div className="max-w-[1500px] mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#111111] border border-[#2a2a2a] flex items-center justify-center">
            <Binary className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-widest text-white uppercase flex items-center gap-2">
                subxero
                <span className="text-[10px] px-1.5 py-0.2 bg-[#111111] text-[#999999] border border-[#2a2a2a] tracking-wider">
                  IDE
                </span>
              </span>
            </div>
            <p className="text-[10px] text-[#555555] uppercase tracking-widest hidden sm:block">
              Monochrome. Cold. Invisible.
            </p>
          </div>
        </div>

        {/* Binary Selector & File Upload */}
        <div className="flex items-center gap-2">
          {/* Sample Preset Dropdown */}
          <div className="relative flex items-center">
            <FolderOpen className="w-3 h-3 text-[#555555] absolute left-2.5 pointer-events-none" />
            <select
              value={currentBinary.id}
              onChange={(e) => {
                const found = SAMPLE_BINARIES.find(b => b.id === e.target.value);
                if (found) onSelectBinary(found);
              }}
              className="bg-[#0a0a0a] text-xs text-white pl-8 pr-3 py-1.5 border border-[#2a2a2a] focus:border-white focus:outline-none transition cursor-pointer max-w-[210px] truncate"
            >
              <optgroup label="Sample Architectures" className="bg-black text-white">
                {SAMPLE_BINARIES.map((b) => (
                  <option key={b.id} value={b.id} className="bg-black text-white">
                    {b.name} [{b.format}/{b.architecture}]
                  </option>
                ))}
              </optgroup>
              {!SAMPLE_BINARIES.some(b => b.id === currentBinary.id) && (
                <option value={currentBinary.id} className="bg-black text-white">
                  {currentBinary.name} [UPLOADED]
                </option>
              )}
            </select>
          </div>

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
            id="binary-file-upload-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a0a] hover:bg-[#111111] text-xs text-white border border-[#2a2a2a] hover:border-[#555555] transition uppercase tracking-wider"
            title="Upload custom binary (.exe, .elf, .dylib, .wasm, .bin)"
          >
            <Upload className="w-3 h-3 text-[#999999]" />
            <span className="hidden md:inline">Upload</span>
          </button>

          {/* Recompile & Export Action Button */}
          <button
            onClick={onOpenRecompiler}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black hover:bg-[#999999] text-xs font-bold border border-white transition uppercase tracking-wider"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-black" />
            <span>Recompile & Export</span>
            {patchCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-black text-white border border-[#2a2a2a] font-bold">
                {patchCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Secondary Status & Navigation Bar */}
      <div className="max-w-[1500px] mx-auto mt-2 pt-2 border-t border-[#2a2a2a] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Active Binary Metadata Pills */}
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="font-mono text-white flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-white"></span>
            {currentBinary.name}
          </span>
          <span className="px-2 py-0.5 border border-[#2a2a2a] bg-[#0a0a0a] text-[#999999] uppercase text-[10px] tracking-wider">
            {currentBinary.format} // {currentBinary.bitness}-BIT
          </span>
          <span className="px-2 py-0.5 border border-[#2a2a2a] bg-[#0a0a0a] text-[#999999] uppercase text-[10px] tracking-wider">
            ARCH: <strong className="text-white font-normal">{currentBinary.architecture}</strong>
          </span>
          <span className="px-2 py-0.5 border border-[#2a2a2a] bg-[#0a0a0a] text-[#555555] uppercase text-[10px] tracking-wider hidden lg:inline">
            ENTRY: <span className="text-[#999999]">0x{currentBinary.entryPoint.toString(16).toUpperCase()}</span>
          </span>
        </div>

        {/* View Tabs */}
        <nav className="flex items-center gap-1 bg-[#0a0a0a] p-0.5 border border-[#2a2a2a]">
          {[
            { id: 'overview', label: 'OVERVIEW' },
            { id: 'disassembly', label: 'DISASM' },
            { id: 'pseudocode', label: 'DECOMPILE' },
            { id: 'cfg', label: 'CFG' },
            { id: 'debugger', label: 'CPU DEBUG' },
            { id: 'hex', label: 'HEX' },
            { id: 'injector', label: 'INJECTOR' },
            { id: 'symbols', label: 'SYMBOLS' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1 text-xs font-mono tracking-wider transition ${
                activeTab === tab.id
                  ? 'bg-white text-black font-bold'
                  : 'text-[#999999] hover:text-white hover:bg-[#111111]'
              }`}
            >
              {tab.label}
              {tab.id === 'injector' && patchCount > 0 && (
                <span className={`ml-1.5 px-1 text-[9px] ${
                  activeTab === tab.id ? 'bg-black text-white' : 'bg-[#111111] text-white border border-[#2a2a2a]'
                }`}>
                  {patchCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

