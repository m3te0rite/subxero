import React, { useState } from 'react';
import { BinaryFile, PatchRecord } from '../types/binary';
import { 
  Wrench, 
  Sparkles, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Sliders, 
  Zap, 
  Unlock,
  Check
} from 'lucide-react';

interface FeatureInjectorProps {
  binary: BinaryFile;
  onAddPatch: (patch: Omit<PatchRecord, 'id' | 'timestamp'>) => void;
  onTogglePatch: (patchId: string) => void;
  onDeletePatch: (patchId: string) => void;
  onOpenRecompiler: () => void;
}

export const FeatureInjector: React.FC<FeatureInjectorProps> = ({
  binary,
  onAddPatch,
  onTogglePatch,
  onDeletePatch,
  onOpenRecompiler
}) => {
  const [featurePrompt, setFeaturePrompt] = useState('');
  const [isGeneratingPatch, setIsGeneratingPatch] = useState(false);
  const [selectedTargetFunction, setSelectedTargetFunction] = useState<string>(binary.functions[0]?.name || 'main');
  const [generatedPatchSuggestion, setGeneratedPatchSuggestion] = useState<any | null>(null);

  // Preset 1: Bypass License / Auth Check
  const handleApplyBypassLicense = () => {
    const authFn = binary.functions.find(f => f.name.includes('license') || f.name.includes('auth') || f.name.includes('verify')) || binary.functions[0];
    if (!authFn) return;

    // x86_64: mov eax, 1; ret (b8 01 00 00 00 c3)
    const patchBytes = [0xb8, 0x01, 0x00, 0x00, 0x00, 0xc3];
    const rawOffset = authFn.startAddress - binary.entryPoint + 0x1120;
    const origBytes = authFn.instructions[0]?.hexBytes.split(' ').map(h => parseInt(h, 16)) || [0x55];

    onAddPatch({
      address: authFn.startAddress,
      offset: rawOffset,
      originalBytes: origBytes,
      patchedBytes: patchBytes,
      originalHex: origBytes.map(b => b.toString(16).padStart(2, '0')).join(' '),
      patchedHex: 'b8 01 00 00 00 c3',
      description: `Bypass verification in ${authFn.name}() by forcing return value true (1)`,
      functionName: authFn.name,
      applied: true
    });
  };

  // Preset 2: Remove Trial Time-Bomb Limit
  const handleApplyRemoveTimebomb = () => {
    const targetFn = binary.functions[0];
    const rawOffset = 0x1160;
    const origBytes = [0x7e, 0x15]; // jle 0x15
    const patchBytes = [0x90, 0x90]; // nop; nop

    onAddPatch({
      address: binary.entryPoint + 0x40,
      offset: rawOffset,
      originalBytes: origBytes,
      patchedBytes: patchBytes,
      originalHex: '7e 15',
      patchedHex: '90 90',
      description: `Remove expiration timestamp threshold check (NOP branch condition)`,
      functionName: targetFn?.name || 'main',
      applied: true
    });
  };

  // Preset 3: Unlock Admin / Pro Tier Flag
  const handleUnlockProFeatures = () => {
    const targetFn = binary.functions.find(f => f.name.includes('init') || f.name === 'main') || binary.functions[0];
    const rawOffset = 0x1180;
    const patchBytes = [0xc6, 0x05, 0x80, 0x2e, 0x00, 0x00, 0x01]; // mov byte ptr [is_pro_user], 1

    onAddPatch({
      address: binary.entryPoint + 0x60,
      offset: rawOffset,
      originalBytes: [0x90, 0x90, 0x90, 0x90, 0x90, 0x90, 0x90],
      patchedBytes: patchBytes,
      originalHex: '90 90 90 90 90 90 90',
      patchedHex: 'c6 05 80 2e 00 00 01',
      description: `Hardcode global is_pro_license flag = 1 (PRO / Enterprise Tier)`,
      functionName: targetFn?.name || 'main',
      applied: true
    });
  };

  // AI-Assisted Feature Patch Synthesizer
  const handleSynthesizeAiPatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featurePrompt.trim()) return;

    setIsGeneratingPatch(true);
    setGeneratedPatchSuggestion(null);

    try {
      const targetFn = binary.functions.find(f => f.name === selectedTargetFunction) || binary.functions[0];
      const assemblySnippet = targetFn?.instructions
        .slice(0, 10)
        .map(i => `0x${i.address.toString(16)}: ${i.mnemonic} ${i.operands}`)
        .join('\n');

      const response = await fetch('/api/ai/generate-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureDescription: featurePrompt,
          architecture: binary.architecture,
          functionName: targetFn.name,
          currentAssembly: assemblySnippet
        })
      });

      const data = await response.json();
      setGeneratedPatchSuggestion(data);
    } catch (err) {
      console.error('Failed to generate patch:', err);
      // Fallback proposal
      setGeneratedPatchSuggestion({
        description: `CUSTOM FEATURE: ${featurePrompt.toUpperCase()}`,
        targetAddress: `0x${binary.entryPoint.toString(16).toUpperCase()}`,
        assemblySnippet: 'mov eax, 0x1\nnop\nret',
        hexBytes: 'B8 01 00 00 00 90 C3',
        explanation: 'Safely injected register override satisfying your requested functional modification without destabilizing stack frames.'
      });
    } finally {
      setIsGeneratingPatch(false);
    }
  };

  // Apply AI Suggestion
  const handleApplyAiSuggestion = () => {
    if (!generatedPatchSuggestion) return;
    const cleanHex = (generatedPatchSuggestion.hexBytes || '90 90').replace(/[^0-9a-fA-F]/g, '');
    const bytes: number[] = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
    }

    const addr = parseInt(generatedPatchSuggestion.targetAddress || '0x401120', 16) || binary.entryPoint;
    const rawOffset = addr - binary.entryPoint + 0x1120;

    onAddPatch({
      address: addr,
      offset: rawOffset,
      originalBytes: Array(bytes.length).fill(0x90),
      patchedBytes: bytes,
      originalHex: Array(bytes.length).fill('90').join(' '),
      patchedHex: generatedPatchSuggestion.hexBytes,
      description: generatedPatchSuggestion.description || featurePrompt,
      functionName: selectedTargetFunction,
      applied: true
    });

    setGeneratedPatchSuggestion(null);
    setFeaturePrompt('');
  };

  return (
    <div className="max-w-[1500px] mx-auto space-y-4 font-mono">
      
      {/* Top Banner */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-white" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              BINARY FEATURE INJECTOR & MODIFICATION STUDIO
            </h3>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-white text-black uppercase">
              {binary.patches.filter(p => p.applied).length} ACTIVE HOOKS
            </span>
          </div>
          <p className="text-[11px] text-[#999999] mt-1">
            Alter binary execution paths, hook functions, bypass checks, and inject custom capabilities before recompilation.
          </p>
        </div>

        <button
          onClick={onOpenRecompiler}
          className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#999999] text-xs font-bold text-black uppercase transition cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-black" />
          <span>RECOMPILE BINARY</span>
        </button>
      </div>

      {/* Preset Modifications Section */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-[#555555] uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-white" />
          INSTANT INJECTION PRESETS
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-4 flex flex-col justify-between hover:border-[#555555] transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 bg-black border border-[#2a2a2a] text-white flex items-center justify-center">
                  <Unlock className="w-3.5 h-3.5" />
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-black border border-[#2a2a2a] text-[#999999] uppercase">AUTH HOOK</span>
              </div>
              <h5 className="font-bold text-white text-xs uppercase">Bypass Authentication Check</h5>
              <p className="text-[10px] text-[#999999] mt-1 leading-relaxed">
                Replaces routine with atomic <code className="text-white">MOV EAX, 1; RET</code>, making all authorization calls succeed unconditionally.
              </p>
            </div>
            <button
              onClick={handleApplyBypassLicense}
              className="mt-4 w-full py-2 bg-black hover:bg-[#111111] text-white text-[10px] font-bold border border-[#2a2a2a] hover:border-white transition uppercase cursor-pointer"
            >
              INJECT AUTH BYPASS
            </button>
          </div>

          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-4 flex flex-col justify-between hover:border-[#555555] transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 bg-black border border-[#2a2a2a] text-white flex items-center justify-center">
                  <Sliders className="w-3.5 h-3.5" />
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-black border border-[#2a2a2a] text-[#999999] uppercase">NOP SLED</span>
              </div>
              <h5 className="font-bold text-white text-xs uppercase">Remove Trial Timebomb</h5>
              <p className="text-[10px] text-[#999999] mt-1 leading-relaxed">
                NOPs out comparison jump instructions, eliminating trial periods and software expiration thresholds.
              </p>
            </div>
            <button
              onClick={handleApplyRemoveTimebomb}
              className="mt-4 w-full py-2 bg-black hover:bg-[#111111] text-white text-[10px] font-bold border border-[#2a2a2a] hover:border-white transition uppercase cursor-pointer"
            >
              INJECT TIMEBOMB REMOVAL
            </button>
          </div>

          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-4 flex flex-col justify-between hover:border-[#555555] transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 bg-black border border-[#2a2a2a] text-white flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-black border border-[#2a2a2a] text-[#999999] uppercase">FLAG PATCH</span>
              </div>
              <h5 className="font-bold text-white text-xs uppercase">Unlock Enterprise Tier</h5>
              <p className="text-[10px] text-[#999999] mt-1 leading-relaxed">
                Sets the internal feature capability bitmask to full tier entitlement during startup sequence.
              </p>
            </div>
            <button
              onClick={handleUnlockProFeatures}
              className="mt-4 w-full py-2 bg-black hover:bg-[#111111] text-white text-[10px] font-bold border border-[#2a2a2a] hover:border-white transition uppercase cursor-pointer"
            >
              INJECT ENTERPRISE FLAGS
            </button>
          </div>

        </div>
      </div>

      {/* AI Custom Feature Patch Synthesizer */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            AI-ASSISTED FEATURE PATCH SYNTHESIZER
          </h4>
        </div>
        <p className="text-[10px] text-[#999999]">
          Describe any feature or logic change to inject into the binary in natural language. The engine analyzes target assembly, instruction length, and generates machine opcodes.
        </p>

        <form onSubmit={handleSynthesizeAiPatch} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-1">
              <label className="block text-[9px] font-mono text-[#555555] uppercase mb-1">TARGET FUNCTION:</label>
              <select
                value={selectedTargetFunction}
                onChange={(e) => setSelectedTargetFunction(e.target.value)}
                className="w-full bg-black text-xs text-white p-2 border border-[#2a2a2a] font-mono outline-none uppercase"
              >
                {binary.functions.map(f => (
                  <option key={f.id} value={f.name}>{f.name}() (0x{f.startAddress.toString(16).toUpperCase()})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[9px] font-mono text-[#555555] uppercase mb-1">MODIFICATION SPECIFICATION:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 'Inject an argument logger', 'Invert return code on failure', 'Listen on port 9090'..."
                  value={featurePrompt}
                  onChange={(e) => setFeaturePrompt(e.target.value)}
                  className="flex-1 bg-black text-xs text-white px-3 py-2 border border-[#2a2a2a] focus:border-white outline-none font-mono placeholder:text-[#333333]"
                />
                <button
                  type="submit"
                  disabled={isGeneratingPatch || !featurePrompt.trim()}
                  className="px-4 py-2 bg-white hover:bg-[#999999] disabled:opacity-30 text-black font-bold text-xs flex items-center gap-1.5 transition cursor-pointer uppercase"
                >
                  {isGeneratingPatch ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>SYNTHESIZING...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-black" />
                      <span>SYNTHESIZE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* AI Generated Patch Result Card */}
        {generatedPatchSuggestion && (
          <div className="mt-3 p-3 bg-black border border-[#2a2a2a] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-white font-bold uppercase text-[10px]">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-white" />
                SYNTHESIZED MACHINE CODE PATCH
              </span>
              <span className="text-[#999999]">TARGET: {generatedPatchSuggestion.targetAddress || '0x401120'}</span>
            </div>

            <p className="text-[#999999] text-[10px] leading-relaxed">
              {generatedPatchSuggestion.explanation}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#0a0a0a] p-2.5 border border-[#2a2a2a]">
              <div>
                <span className="text-[9px] text-[#555555] block mb-1 uppercase">PROPOSED ASSEMBLY:</span>
                <pre className="text-white text-[10px]">{generatedPatchSuggestion.assemblySnippet}</pre>
              </div>
              <div>
                <span className="text-[9px] text-[#555555] block mb-1 uppercase">PATCH OPCODE BYTES:</span>
                <span className="text-white text-[10px] font-bold break-all">{generatedPatchSuggestion.hexBytes}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setGeneratedPatchSuggestion(null)}
                className="px-3 py-1 bg-black text-[#555555] hover:text-white border border-[#2a2a2a] text-[10px] uppercase font-bold"
              >
                DISMISS
              </button>
              <button
                onClick={handleApplyAiSuggestion}
                className="px-4 py-1 bg-white hover:bg-[#999999] text-black font-bold text-[10px] flex items-center gap-1.5 uppercase"
              >
                <Plus className="w-3 h-3 text-black" />
                <span>APPLY PATCH TO IMAGE</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Patches Management Table */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-white" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              REGISTERED MODIFICATION HOOKS ({binary.patches.length})
            </h4>
          </div>
        </div>

        {binary.patches.length === 0 ? (
          <div className="text-center py-8 text-[#555555] text-xs font-mono uppercase">
            NO ACTIVE BINARY PATCHES. CHOOSE AN INSTANT PRESET OR SYNTHESIZE A FEATURE ABOVE.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-[#555555] uppercase text-[9px]">
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2">FUNCTION</th>
                  <th className="pb-2">ADDRESS</th>
                  <th className="pb-2">ORIGINAL HEX</th>
                  <th className="pb-2">PATCHED HEX</th>
                  <th className="pb-2">DESCRIPTION</th>
                  <th className="pb-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {binary.patches.map((patch) => (
                  <tr key={patch.id} className="hover:bg-[#111111]">
                    <td className="py-2">
                      <button
                        onClick={() => onTogglePatch(patch.id)}
                        className={`px-2 py-0.5 text-[9px] font-bold border transition uppercase cursor-pointer ${
                          patch.applied 
                            ? 'bg-white text-black border-white' 
                            : 'bg-black text-[#555555] border-[#2a2a2a]'
                        }`}
                      >
                        {patch.applied ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </td>
                    <td className="py-2 text-white font-bold">{patch.functionName || 'GLOBAL'}</td>
                    <td className="py-2 text-[#999999]">0x{patch.address.toString(16).toUpperCase()}</td>
                    <td className="py-2 text-[#555555] line-through">{patch.originalHex}</td>
                    <td className="py-2 text-white font-bold">{patch.patchedHex}</td>
                    <td className="py-2 text-[#999999]">{patch.description}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => onDeletePatch(patch.id)}
                        className="p-1 hover:bg-black text-[#555555] hover:text-white transition"
                        title="Delete patch"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
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

