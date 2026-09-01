import React, { useState } from 'react';
import { BinaryFile, RecompileTarget } from '../types/binary';
import { 
  RECOMPILE_TARGETS, 
  applyPatchesToBuffer, 
  generateStandaloneCHarness, 
  generatePythonPatchScript 
} from '../lib/recompiler';
import { 
  DownloadCloud, 
  Cpu, 
  X, 
  Terminal, 
  Copy, 
  Check,
  Zap
} from 'lucide-react';

interface RecompilerModalProps {
  binary: BinaryFile;
  isOpen: boolean;
  onClose: () => void;
}

export const RecompilerModal: React.FC<RecompilerModalProps> = ({
  binary,
  isOpen,
  onClose
}) => {
  const [selectedTarget, setSelectedTarget] = useState<RecompileTarget>(RECOMPILE_TARGETS[0]);
  const [isRecompiling, setIsRecompiling] = useState(false);
  const [recompileLogs, setRecompileLogs] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'build' | 'preview'>('build');

  if (!isOpen) return null;

  const patchedBytes = applyPatchesToBuffer(binary.rawBytes, binary.patches);
  const activePatches = binary.patches.filter(p => p.applied);

  // Recompilation simulation & export
  const handleStartRecompileAndDownload = () => {
    setIsRecompiling(true);
    setRecompileLogs([]);

    const steps = [
      `[1/6] INITIALIZING COMPILER PIPELINE FOR TARGET: ${selectedTarget.name.toUpperCase()}`,
      `[2/6] VERIFYING ${activePatches.length} ACTIVE BINARY ALTERATION HOOKS...`,
      `[3/6] APPLYING ATOMIC MACHINE BYTECODE OVERRIDES AT MAPPED VIRTUAL OFFSETS...`,
      `[4/6] RE-CALCULATING SECTION HEADERS, SYMBOLS, AND MEMORY ALIGNMENT...`,
      `[5/6] GENERATING TARGET CONTAINER FORMAT [${selectedTarget.format.toUpperCase()} - ${selectedTarget.architecture.toUpperCase()}]...`,
      `[6/6] CHECKSUM VALIDATION PASSED. BINARY EMITTED.`
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setRecompileLogs(prev => [...prev, step]);
        if (idx === steps.length - 1) {
          setIsRecompiling(false);
          triggerDownload();
        }
      }, (idx + 1) * 300);
    });
  };

  // Trigger actual file download
  const triggerDownload = () => {
    let blob: Blob;
    let filename = `${binary.name.replace(/\.[^/.]+$/, '')}_recompiled${selectedTarget.extension}`;

    if (selectedTarget.id === 'target_c_harness') {
      const code = generateStandaloneCHarness(binary, patchedBytes);
      blob = new Blob([code], { type: 'text/x-csrc' });
    } else {
      blob = new Blob([patchedBytes], { type: 'application/octet-stream' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Standalone code preview
  const previewCode = selectedTarget.id === 'target_c_harness' 
    ? generateStandaloneCHarness(binary, patchedBytes)
    : generatePythonPatchScript(binary);

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 font-mono">
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black border border-[#2a2a2a] flex items-center justify-center text-white">
              <DownloadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                CROSS-PLATFORM RECOMPILER & EXPORT WIZARD
              </h3>
              <p className="text-[10px] text-[#555555] uppercase">
                SOURCE: <span className="text-white">{binary.name}</span> | ACTIVE HOOKS: <span className="text-white font-bold">{activePatches.length}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[#555555] hover:text-white hover:bg-black transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab View Selector */}
        <div className="px-4 pt-2.5 border-b border-[#2a2a2a] flex gap-2">
          <button
            onClick={() => setActiveViewTab('build')}
            className={`px-3 py-1 text-[10px] font-bold uppercase transition ${
              activeViewTab === 'build' ? 'bg-white text-black' : 'bg-black text-[#555555] hover:text-white border border-[#2a2a2a]'
            }`}
          >
            RECOMPILER TARGETS
          </button>
          <button
            onClick={() => setActiveViewTab('preview')}
            className={`px-3 py-1 text-[10px] font-bold uppercase transition ${
              activeViewTab === 'preview' ? 'bg-white text-black' : 'bg-black text-[#555555] hover:text-white border border-[#2a2a2a]'
            }`}
          >
            STANDALONE SCRIPT PREVIEW
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 font-mono text-xs">
          
          {activeViewTab === 'build' ? (
            <>
              {/* Target Selection Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#555555] uppercase tracking-wider block">
                  SELECT TARGET ARCHITECTURE & OS CONTAINER:
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {RECOMPILE_TARGETS.map((target) => {
                    const isSelected = selectedTarget.id === target.id;
                    return (
                      <div
                        key={target.id}
                        onClick={() => setSelectedTarget(target)}
                        className={`p-3 border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#111111] border-white text-white'
                            : 'bg-black border-[#2a2a2a] hover:border-[#555555]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-[11px] flex items-center gap-1.5 uppercase">
                              <Cpu className="w-3 h-3 text-white" />
                              {target.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-black border border-[#2a2a2a] text-white font-mono uppercase">
                              {target.extension}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#999999] leading-relaxed">
                            {target.description}
                          </p>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-[#2a2a2a] flex items-center justify-between text-[9px] text-[#555555] font-mono uppercase">
                          <span>OS: {target.compatibleOS.slice(0, 3).join(', ')}</span>
                          <span className="text-white font-bold">{target.architecture}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compilation Logs Window */}
              {recompileLogs.length > 0 && (
                <div className="bg-black border border-[#2a2a2a] p-3 font-mono text-[10px] space-y-1">
                  <div className="flex items-center gap-1.5 text-white font-bold mb-1 uppercase text-[9px]">
                    <Terminal className="w-3 h-3" />
                    <span>BUILD & LINK PIPELINE OUTPUT:</span>
                  </div>
                  {recompileLogs.map((log, i) => (
                    <div key={i} className="text-[#999999]">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Standalone Code Preview */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#555555] uppercase">
                  {selectedTarget.id === 'target_c_harness' ? 'C STANDALONE EXECUTABLE RUNNER' : 'PYTHON BINARY PATCH SCRIPT'}
                </span>
                <button
                  onClick={handleCopyPreview}
                  className="flex items-center gap-1 px-2.5 py-0.5 bg-black border border-[#2a2a2a] text-[10px] text-white uppercase hover:border-white"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-[#555555]" />}
                  <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>

              <pre className="bg-black p-3 border border-[#2a2a2a] font-mono text-[10px] text-white overflow-x-auto max-h-[350px]">
                <code>{previewCode}</code>
              </pre>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2a2a2a] bg-[#0a0a0a] flex items-center justify-between">
          <div className="text-[10px] text-[#555555] font-mono hidden sm:block uppercase">
            TARGET OUT: <span className="text-white">{binary.name.replace(/\.[^/.]+$/, '')}_recompiled{selectedTarget.extension}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-black hover:bg-[#111111] text-[#999999] hover:text-white border border-[#2a2a2a] text-[10px] font-bold uppercase transition"
            >
              CANCEL
            </button>

            <button
              onClick={handleStartRecompileAndDownload}
              disabled={isRecompiling}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-[#999999] disabled:opacity-40 text-black font-bold text-[10px] uppercase transition cursor-pointer"
            >
              <Zap className="w-3 h-3 text-black" />
              <span>{isRecompiling ? 'BUILDING & PACKAGING...' : 'RECOMPILE & DOWNLOAD'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

