import React, { useState } from 'react';
import { BinaryFile, DecompiledFunction } from '../types/binary';
import { 
  Sparkles, 
  Code2, 
  ShieldCheck, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  Lightbulb,
  FileCode
} from 'lucide-react';

interface PseudocodeViewProps {
  binary: BinaryFile;
  selectedFunction: DecompiledFunction;
  onUpdateFunctionAI: (functionId: string, aiPseudocode: string, aiExplanation: string, variables: any[], securityNotes: string) => void;
}

export const PseudocodeView: React.FC<PseudocodeViewProps> = ({
  binary,
  selectedFunction,
  onUpdateFunctionAI
}) => {
  const [isDecompilingAI, setIsDecompilingAI] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'code' | 'explanation' | 'variables' | 'security'>('code');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trigger Gemini AI Decompilation & Logic Extraction
  const handleAiDecompile = async () => {
    setIsDecompilingAI(true);
    setErrorMessage(null);

    try {
      const assemblySnippet = selectedFunction.instructions
        .map(i => `0x${i.address.toString(16)}: ${i.mnemonic} ${i.operands} ${i.comment ? '; ' + i.comment : ''}`)
        .join('\n');

      const response = await fetch('/api/ai/decompile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: selectedFunction.name,
          architecture: binary.architecture,
          binaryFormat: binary.format,
          assemblyCode: assemblySnippet,
          contextStrings: binary.strings.map(s => s.value)
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.pseudocode) {
        onUpdateFunctionAI(
          selectedFunction.id,
          data.pseudocode,
          data.explanation || 'Semantic logic analysis generated.',
          data.suggestedVariables || [],
          data.securityNotes || 'No high-severity memory corruption vulnerabilities identified.'
        );
      }
    } catch (err: any) {
      console.error('AI Decompilation failed:', err);
      setErrorMessage('COULD NOT CONNECT TO AI SERVICE. DISPLAYING STATIC AST DECOMPILATION.');
    } finally {
      setIsDecompilingAI(false);
    }
  };

  const currentCode = selectedFunction.aiPseudocode || selectedFunction.pseudocode;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadC = () => {
    const blob = new Blob([currentCode], { type: 'text/x-csrc' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFunction.name}_decompiled.c`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1500px] mx-auto space-y-3 font-mono">
      
      {/* Header Bar with Action Controls */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-white" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {selectedFunction.name}() PSEUDOCODE
            </h3>
            {selectedFunction.aiPseudocode ? (
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-white text-black flex items-center gap-1 uppercase">
                <Sparkles className="w-2.5 h-2.5" />
                AI ENHANCED
              </span>
            ) : (
              <span className="px-1.5 py-0.2 text-[9px] bg-black text-[#999999] border border-[#2a2a2a] uppercase">
                HEURISTIC AST
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#555555] font-mono mt-0.5 uppercase">
            SIGNATURE: <span className="text-[#999999]">{selectedFunction.signature}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={handleAiDecompile}
            disabled={isDecompilingAI}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-[#999999] disabled:opacity-40 text-xs font-bold transition uppercase tracking-wider cursor-pointer"
          >
            {isDecompilingAI ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-black" />
                <span>DECOMPILING...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                <span>{selectedFunction.aiPseudocode ? 'RE-ANALYZE WITH AI' : 'DEEP AI DECOMPILE'}</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold border border-[#2a2a2a] hover:border-white transition uppercase"
            title="Copy C Code"
          >
            {copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-[#999999]" />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>

          <button
            onClick={handleDownloadC}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold border border-[#2a2a2a] hover:border-white transition uppercase"
            title="Download .c file"
          >
            <Download className="w-3 h-3 text-[#999999]" />
            <span>EXPORT .C</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 bg-black border border-[#555555] text-[11px] text-white flex items-center gap-2 uppercase">
          <AlertTriangle className="w-3.5 h-3.5 text-white flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tab Navigation for Pseudocode View */}
      <div className="flex items-center gap-1.5 border-b border-[#2a2a2a] pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('code')}
          className={`px-3 py-1 text-xs font-mono transition flex items-center gap-1.5 uppercase ${
            activeSubTab === 'code'
              ? 'bg-white text-black font-bold'
              : 'bg-black text-[#999999] border border-[#2a2a2a] hover:text-white'
          }`}
        >
          <FileCode className="w-3 h-3" />
          <span>C PSEUDOCODE</span>
        </button>

        <button
          onClick={() => setActiveSubTab('explanation')}
          className={`px-3 py-1 text-xs font-mono transition flex items-center gap-1.5 uppercase ${
            activeSubTab === 'explanation'
              ? 'bg-white text-black font-bold'
              : 'bg-black text-[#999999] border border-[#2a2a2a] hover:text-white'
          }`}
        >
          <Lightbulb className="w-3 h-3" />
          <span>LOGIC & FLOW</span>
        </button>

        <button
          onClick={() => setActiveSubTab('variables')}
          className={`px-3 py-1 text-xs font-mono transition flex items-center gap-1.5 uppercase ${
            activeSubTab === 'variables'
              ? 'bg-white text-black font-bold'
              : 'bg-black text-[#999999] border border-[#2a2a2a] hover:text-white'
          }`}
        >
          <Code2 className="w-3 h-3" />
          <span>VARIABLES</span>
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          className={`px-3 py-1 text-xs font-mono transition flex items-center gap-1.5 uppercase ${
            activeSubTab === 'security'
              ? 'bg-white text-black font-bold'
              : 'bg-black text-[#999999] border border-[#2a2a2a] hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>SECURITY HOOKS</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-3.5 min-h-[500px]">
        
        {/* C Pseudocode Code Block */}
        {activeSubTab === 'code' && (
          <div className="relative font-mono text-xs text-white leading-relaxed bg-black p-4 border border-[#2a2a2a] overflow-x-auto">
            <pre>
              <code>{currentCode}</code>
            </pre>
          </div>
        )}

        {/* Explanation Tab */}
        {activeSubTab === 'explanation' && (
          <div className="space-y-3 text-xs text-[#999999]">
            <div className="p-3.5 bg-black border border-[#2a2a2a] space-y-2.5">
              <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                ALGORITHM & LOGIC BREAKDOWN
              </h4>
              <p className="text-xs text-[#999999] leading-relaxed">
                {selectedFunction.aiExplanation || 
                  'The function performs static initialization, checks input parameters, executes conditional validation branches, and returns the result code.'}
              </p>

              <div className="pt-2 border-t border-[#2a2a2a] text-xs space-y-1.5 uppercase">
                <h5 className="font-bold text-white">KEY INSIGHTS:</h5>
                <ul className="space-y-1 text-[#999999]">
                  <li>- CYCLOMATIC COMPLEXITY: <strong className="text-white">{selectedFunction.cyclomaticComplexity}</strong> (INDEPENDENT LOGIC PATHS)</li>
                  <li>- CALLER HIERARCHY: <span className="text-white">{selectedFunction.callers.join(', ') || 'ROOT ENTRY'}</span></li>
                  <li>- CALLEE INVOCATIONS: <span className="text-white">{selectedFunction.callees.join(', ') || 'NO SUB-CALLS'}</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Variables Tab */}
        {activeSubTab === 'variables' && (
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold text-[#555555] uppercase tracking-widest">
              RECONSTRUCTED STACK & REGISTER VARIABLES
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#2a2a2a] text-[#555555] text-[10px] uppercase">
                    <th className="pb-2">ASSEMBLY LOCATION</th>
                    <th className="pb-2">SUGGESTED NAME</th>
                    <th className="pb-2">INFERRED TYPE</th>
                    <th className="pb-2">PURPOSE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {selectedFunction.variables.map((v, i) => (
                    <tr key={i} className="hover:bg-[#111111]">
                      <td className="py-2 text-white font-bold">{v.original}</td>
                      <td className="py-2 text-white font-bold">{v.suggested}</td>
                      <td className="py-2 text-[#999999]">{v.type}</td>
                      <td className="py-2 text-[#555555]">{v.description || 'Local stack variable'}</td>
                    </tr>
                  ))}
                  {selectedFunction.variables.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-[#555555] uppercase">
                        Click "DEEP AI DECOMPILE" above to automatically reconstruct variable names and types.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Security & Patch Points Tab */}
        {activeSubTab === 'security' && (
          <div className="space-y-3">
            <div className="p-3.5 bg-black border border-[#2a2a2a] space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                BINARY ALTERATION & PATCHING ANALYSIS
              </h4>
              <p className="text-xs text-[#999999] leading-relaxed">
                {selectedFunction.securityNotes || 
                  'Identified primary conditional branch points in the disassembly table. You can use the Feature Injector tab or the Inline Patch drawer to modify execution flow seamlessly.'}
              </p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

