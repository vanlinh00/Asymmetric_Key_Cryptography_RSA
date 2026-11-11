import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Lock,
  Unlock,
  Server,
  FileCode,
  Terminal,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Copy,
  Layers,
  Cpu,
  FileText,
  ChevronRight,
  Play,
  Check,
  ExternalLink,
  Code2,
  Sparkles,
  ShieldAlert,
  Flame,
  Zap,
  XCircle,
  CheckCircle
} from 'lucide-react';
import { PROJECT_FILES, ProjectFile } from './data/projectFiles';
import { FILE_CONTENTS } from './data/projectContents';
import { downloadMavenProjectZip } from './utils/zipExport';
import {
  generateSigningKeyPair,
  generateRsaKeyPair,
  createRs256Jwt,
  verifyRs256Jwt,
  encryptRsaOaep,
  decryptRsaOaep
} from './utils/webCrypto';

type Tab = 'simulator' | 'security-comparison' | 'architecture' | 'crypto-lab' | 'codebase' | 'runbook';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('security-comparison');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(PROJECT_FILES[0]);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Live Crypto Lab State
  const [keyPairLoading, setKeyPairLoading] = useState(false);
  const [generatedPubPem, setGeneratedPubPem] = useState<string>('');
  const [generatedPrivPem, setGeneratedPrivPem] = useState<string>('');
  const [activeJwk, setActiveJwk] = useState<any>(null);
  const [labCryptoKeyPair, setLabCryptoKeyPair] = useState<{
    signing: any;
    oaep: any;
  } | null>(null);

  // Lab JWT State
  const [jwtSubject, setJwtSubject] = useState('alice');
  const [jwtRole, setJwtRole] = useState('ROLE_USER');
  const [generatedJwt, setGeneratedJwt] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Lab OAEP State
  const [plaintextInput, setPlaintextInput] = useState('Confidential Account Transfer #948271: $75,000');
  const [encryptedCiphertext, setEncryptedCiphertext] = useState('');
  const [decryptedPlaintext, setDecryptedPlaintext] = useState('');

  // Simulator State
  const [simStep, setSimStep] = useState<number>(1);
  const [simToken, setSimToken] = useState<string>('');
  const [simCiphertext, setSimCiphertext] = useState<string>('');
  const [simDecrypted, setSimDecrypted] = useState<string>('');
  const [simLog, setSimLog] = useState<Array<{ title: string; detail: string; status: 'info' | 'success' | 'warn'; time: string }>>([
    {
      title: 'Environment Initialized',
      detail: 'auth-service (Port 8081) holding Private Key, resource-service (Port 8082) holding Public Key only.',
      status: 'info',
      time: '00:00:00'
    }
  ]);

  // Security Comparison & Attack Simulation State
  const [attackArch, setAttackArch] = useState<'hs256' | 'rs256'>('rs256');
  const [breachTriggered, setBreachTriggered] = useState(false);
  const [forgeryAttemptStatus, setForgeryAttemptStatus] = useState<'idle' | 'forged' | 'blocked'>('idle');
  const [forgedTokenData, setForgedTokenData] = useState<string>('');

  function triggerBreachSimulation(arch: 'hs256' | 'rs256') {
    setAttackArch(arch);
    setBreachTriggered(true);
    setForgeryAttemptStatus('idle');
    setForgedTokenData('');
    if (arch === 'hs256') {
      addLog('Breach Simulation (HS256)', 'Downstream microservice breached! Symmetric secret leaked.', 'warn');
    } else {
      addLog('Breach Simulation (RS256)', 'Downstream microservice breached! Only Public Key exposed.', 'info');
    }
  }

  function attemptTokenForgery() {
    if (attackArch === 'hs256') {
      const fakePayload = {
        sub: 'malicious-hacker-404',
        roles: ['ROLE_SUPER_ADMIN', 'ROOT_ACCESS'],
        iss: 'http://localhost:8081',
        aud: 'all-microservices',
        exp: Math.floor(Date.now() / 1000) + 86400
      };
      const header = { alg: 'HS256', typ: 'JWT' };
      const forged = `${btoa(JSON.stringify(header)).replace(/=+$/, '')}.${btoa(JSON.stringify(fakePayload)).replace(/=+$/, '')}.sYmMeTrIc_StOlEn_SeCrEt_SiG_984`;
      setForgedTokenData(forged);
      setForgeryAttemptStatus('forged');
      addLog('CRITICAL BREACH (HS256)', 'Attacker minted valid SUPER_ADMIN token using stolen shared secret!', 'warn');
    } else {
      setForgeryAttemptStatus('blocked');
      setForgedTokenData('');
      addLog('ATTACK NEUTRALIZED (RS256)', 'Token forgery mathematically impossible: requires private_key.pem!', 'success');
    }
  }

  // Initialize WebCrypto keys on startup
  useEffect(() => {
    initCryptoLab();
  }, []);

  async function initCryptoLab() {
    try {
      setKeyPairLoading(true);
      const signPair = await generateSigningKeyPair(2048);
      const oaepPair = await generateRsaKeyPair(2048);

      setLabCryptoKeyPair({
        signing: signPair.signingKeyPair,
        oaep: oaepPair.keyPair
      });
      setGeneratedPubPem(signPair.publicKeyPem);
      setGeneratedPrivPem(oaepPair.privateKeyPem);
      setActiveJwk(signPair.publicJwk);

      // Pre-generate sample JWT
      const initialToken = await createRs256Jwt(
        {
          iss: 'http://localhost:8081',
          sub: 'alice',
          aud: 'resource-service',
          roles: ['ROLE_USER'],
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        signPair.signingKeyPair.privateKey
      );
      setGeneratedJwt(initialToken);
      setSimToken(initialToken);

      // Pre-encrypt sample payload
      const initialCipher = await encryptRsaOaep(plaintextInput, oaepPair.keyPair.publicKey);
      setEncryptedCiphertext(initialCipher);
      setSimCiphertext(initialCipher);

      addLog('Crypto Lab Ready', 'Generated in-memory 2048-bit RSA key pairs with SHA-256 for RS256 & OAEP.', 'success');
    } catch (e) {
      console.error(e);
      addLog('Crypto Lab Initialization Failed', String(e), 'warn');
    } finally {
      setKeyPairLoading(false);
    }
  }

  function addLog(title: string, detail: string, status: 'info' | 'success' | 'warn' = 'info') {
    const time = new Date().toTimeString().split(' ')[0];
    setSimLog(prev => [{ title, detail, status, time }, ...prev.slice(0, 19)]);
  }

  async function handleSignJwt() {
    if (!labCryptoKeyPair?.signing) return;
    try {
      const now = Math.floor(Date.now() / 1000);
      const token = await createRs256Jwt(
        {
          iss: 'http://localhost:8081',
          sub: jwtSubject,
          aud: 'resource-service',
          roles: [jwtRole],
          iat: now,
          exp: now + 3600,
          email: `${jwtSubject}@security.demo`
        },
        labCryptoKeyPair.signing.privateKey
      );
      setGeneratedJwt(token);
      setVerificationResult(null);
      addLog('RS256 JWT Signed', `Issued token for subject: ${jwtSubject} with kid: rsa-auth-key-1`, 'success');
    } catch (e: any) {
      alert('Failed to sign JWT: ' + e.message);
    }
  }

  async function handleVerifyJwt() {
    if (!labCryptoKeyPair?.signing || !generatedJwt) return;
    try {
      const result = await verifyRs256Jwt(generatedJwt, labCryptoKeyPair.signing.publicKey);
      setVerificationResult(result);
      if (result.valid) {
        addLog('JWT Verified', 'Signature successfully validated against RSA Public Key!', 'success');
      } else {
        addLog('JWT Verification Failed', result.error || 'Invalid signature', 'warn');
      }
    } catch (e: any) {
      setVerificationResult({ valid: false, error: e.message });
    }
  }

  async function handleEncryptOaep() {
    if (!labCryptoKeyPair?.oaep) return;
    try {
      const cipher = await encryptRsaOaep(plaintextInput, labCryptoKeyPair.oaep.publicKey);
      setEncryptedCiphertext(cipher);
      setDecryptedPlaintext('');
      addLog('RSA-OAEP Encrypted', `Transformed ${plaintextInput.length} bytes into ${cipher.length} Base64 chars`, 'success');
    } catch (e: any) {
      alert('Encryption failed: ' + e.message);
    }
  }

  async function handleDecryptOaep() {
    if (!labCryptoKeyPair?.oaep || !encryptedCiphertext) return;
    try {
      const plain = await decryptRsaOaep(encryptedCiphertext, labCryptoKeyPair.oaep.privateKey);
      setDecryptedPlaintext(plain);
      addLog('RSA-OAEP Decrypted', `Decrypted plaintext with Private Key: "${plain}"`, 'success');
    } catch (e: any) {
      alert('Decryption failed: ' + e.message);
    }
  }

  async function handleDownloadZip() {
    try {
      setDownloadingZip(true);
      await downloadMavenProjectZip(progress => setDownloadProgress(progress));
      addLog('Project Exported', 'Full multi-module Maven project downloaded as .zip archive', 'success');
    } catch (err: any) {
      alert('Error downloading zip: ' + err.message);
    } finally {
      setDownloadingZip(false);
      setDownloadProgress(0);
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(id);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const filteredFiles = PROJECT_FILES.filter(
    f => moduleFilter === 'all' || f.module === moduleFilter
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">RSA Asymmetric Cryptography Microservices</h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Spring Boot 3.4
              </span>
            </div>
            <p className="text-xs text-slate-400">Java 17 • Spring Security 6.4 • Nimbus JOSE • RFC 7517 JWKS • JCA RSA-OAEP</p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloadingZip ? `Zipping (${downloadProgress}%)...` : 'Download Project (.zip)'}
          </button>
        </div>
      </header>

      {/* Secondary Sub-Header Tabs */}
      <nav className="border-b border-slate-800 bg-slate-900/50 px-4 lg:px-8 flex overflow-x-auto gap-1">
        {[
          { id: 'security-comparison', label: 'Why RS256? (Security Analysis)', icon: ShieldAlert },
          { id: 'simulator', label: 'Microservice Simulator', icon: Play },
          { id: 'architecture', label: 'Architecture & Cryptographic Flow', icon: Layers },
          { id: 'crypto-lab', label: 'Live Cryptography Lab', icon: Cpu },
          { id: 'codebase', label: 'Codebase Explorer', icon: FileCode },
          { id: 'runbook', label: 'CLI & Runbook', icon: Terminal },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Main Tab Content */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* TAB 0: WHY ASYMMETRIC (RS256) IS SAFER (SECURITY COMPARISON & THREAT MODEL) */}
        {/* ========================================================================= */}
        {activeTab === 'security-comparison' && (
          <div className="space-y-6">
            {/* Core Architectural Axiom Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold uppercase tracking-wider">
                      Principal Engineer Security Principle
                    </span>
                    <span className="text-xs text-slate-400">Zero-Trust Microservices</span>
                  </div>
                  <blockquote className="text-base md:text-lg font-semibold text-white tracking-tight leading-relaxed italic border-l-4 border-indigo-500 pl-4 py-1">
                    “Asymmetric keys (like RS256): It uses a pair of keys. The Auth server uses a Private Key to create the token, while other servers use a Public Key to verify it. This is safer for microservices.”
                  </blockquote>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-4xl pt-1">
                    In a distributed microservice architecture, <strong>asymmetric cryptography decouples token minting authority from token verification ability</strong>. Downstream services need only verify identity—they must never possess the power to forge credentials.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Blast Radius & Downstream Breach Simulator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                    Interactive Blast Radius & Attack Simulation
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulate what happens when a low-privilege downstream microservice (e.g. Analytics / Reporting) is compromised by an attacker.
                  </p>
                </div>

                {/* Architecture Selector Toggle */}
                <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
                  <button
                    onClick={() => triggerBreachSimulation('hs256')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      attackArch === 'hs256'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    HS256 (Symmetric Shared Secret)
                  </button>
                  <button
                    onClick={() => triggerBreachSimulation('rs256')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      attackArch === 'rs256'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    RS256 (Asymmetric Key Pair)
                  </button>
                </div>
              </div>

              {/* Topology Visualizer during Attack */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Auth Service */}
                <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 relative">
                  <div className="text-[10px] uppercase font-bold text-indigo-400 mb-1 flex items-center justify-between">
                    <span>Token Issuer</span>
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white">auth-service (8081)</h4>
                  <div className="mt-3 text-[11px] font-mono space-y-1">
                    <div className="text-slate-400">Holds:</div>
                    <div className="px-2 py-1 rounded bg-slate-900 text-xs border border-slate-800 text-indigo-300">
                      {attackArch === 'hs256' ? 'jwt.secret (Shared)' : 'private_key.pem (Isolated)'}
                    </div>
                  </div>
                  <span className="inline-block mt-3 text-[10px] text-emerald-400 font-medium">✓ Protected in DMZ</span>
                </div>

                {/* Payments Service */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
                    <span>High Value Target</span>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white">payments-service</h4>
                  <div className="mt-3 text-[11px] font-mono space-y-1">
                    <div className="text-slate-400">Holds:</div>
                    <div className="px-2 py-1 rounded bg-slate-900 text-xs border border-slate-800 text-slate-300">
                      {attackArch === 'hs256' ? 'jwt.secret (Same Secret)' : 'public_key.pem'}
                    </div>
                  </div>
                  <span className={`inline-block mt-3 text-[10px] font-medium ${
                    breachTriggered && attackArch === 'hs256' ? 'text-rose-400 font-bold' : 'text-slate-400'
                  }`}>
                    {breachTriggered && attackArch === 'hs256' ? '⚠️ At High Risk of Forgery' : '✓ Secure'}
                  </span>
                </div>

                {/* Targeted Downstream Service */}
                <div className={`p-4 rounded-xl transition border relative ${
                  breachTriggered
                    ? 'bg-rose-950/20 border-rose-500/60 ring-2 ring-rose-500/30'
                    : 'bg-slate-950 border-slate-800'
                }`}>
                  {breachTriggered && (
                    <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5" /> BREACHED!
                    </span>
                  )}
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
                    <span>Downstream Service</span>
                    <Server className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white">reporting-service</h4>
                  <div className="mt-3 text-[11px] font-mono space-y-1">
                    <div className="text-slate-400">Holds:</div>
                    <div className={`px-2 py-1 rounded text-xs border font-bold ${
                      breachTriggered
                        ? 'bg-rose-900/40 text-rose-300 border-rose-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}>
                      {attackArch === 'hs256' ? 'jwt.secret (LEAKED!)' : 'public_key.pem (Public)'}
                    </div>
                  </div>
                  <span className="inline-block mt-3 text-[10px] text-rose-400 font-medium">Attacker dumped memory</span>
                </div>

                {/* User / Resource Service */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
                    <span>Downstream Service</span>
                    <Server className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white">resource-service (8082)</h4>
                  <div className="mt-3 text-[11px] font-mono space-y-1">
                    <div className="text-slate-400">Holds:</div>
                    <div className="px-2 py-1 rounded bg-slate-900 text-xs border border-slate-800 text-slate-300">
                      {attackArch === 'hs256' ? 'jwt.secret (Same Secret)' : 'public_key.pem'}
                    </div>
                  </div>
                  <span className="inline-block mt-3 text-[10px] text-slate-400 font-medium">Validates Bearer tokens</span>
                </div>
              </div>

              {/* Action Trigger & Outcome */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-200">Attack Stage 2: Token Forgery Attempt</span>
                    <p className="text-[11px] text-slate-400">
                      Attacker tries to mint a counterfeit token with <code className="text-rose-400">ROLE_SUPER_ADMIN</code> using the stolen cryptographic material.
                    </p>
                  </div>
                  <button
                    onClick={attemptTokenForgery}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition active:scale-95"
                  >
                    <Zap className="w-4 h-4" />
                    Attempt Counterfeit Token Forgery
                  </button>
                </div>

                {/* Attack Result Display */}
                {forgeryAttemptStatus === 'forged' && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-rose-200">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                      CRITICAL SYSTEM COMPROMISE (HS256 Failure Mode)
                    </div>
                    <p className="text-xs leading-relaxed text-rose-200/90">
                      Because <strong>HS256 uses the same secret for both signing and verifying</strong>, stealing the verification key from <code className="bg-rose-950 px-1 py-0.5 rounded">reporting-service</code> gave the attacker <strong>full token minting authority</strong>.
                      The attacker successfully minted a counterfeit token with <code className="text-white font-bold">ROLE_SUPER_ADMIN</code>.
                      When presented to <code className="text-white font-bold">payments-service</code>, the signature validates perfectly! The entire cluster is compromised.
                    </p>
                    <div className="p-3 bg-slate-950 rounded-lg border border-rose-500/30 font-mono text-[11px] break-all text-rose-300">
                      <strong>Forged Counterfeit Token:</strong> {forgedTokenData}
                    </div>
                  </div>
                )}

                {forgeryAttemptStatus === 'blocked' && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-200">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      ATTACK NEUTRALIZED BY ASYMMETRIC CRYPTOGRAPHY (RS256 Success Mode)
                    </div>
                    <p className="text-xs leading-relaxed text-emerald-200/90">
                      Even though <code className="bg-emerald-950/60 px-1 py-0.5 rounded">reporting-service</code> was completely breached, the attacker only obtained <code className="text-white font-mono font-bold">public_key.pem</code>.
                      <strong> In RS256, a public key can ONLY verify signatures—it is mathematically impossible to sign or forge tokens with it</strong>.
                      Token minting requires the private exponent <code className="text-white font-mono">d</code>, which resides solely inside <code className="text-white font-bold">auth-service</code>.
                      The blast radius of the breach is strictly contained.
                    </p>
                    <div className="p-3 bg-slate-950 rounded-lg border border-emerald-500/30 font-mono text-[11px] text-emerald-400">
                      ✓ Mathematical Proof: S = H^d mod n requires private key (d). Signature generation without (d) yields invalid token rejected by payments-service.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deep Technical Comparison Matrix */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Symmetric (HS256) vs Asymmetric (RS256) in Microservices: Architectural Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Why enterprise microservice ecosystems (Netflix, Amazon, Google, Spring Security) mandate Asymmetric Key Cryptography.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Dimension</th>
                      <th className="py-3 px-4 text-rose-400">HS256 (Symmetric HMAC)</th>
                      <th className="py-3 px-4 text-emerald-400">RS256 (Asymmetric RSA)</th>
                      <th className="py-3 px-4">Microservice Architectural Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">1. Secret Distribution</td>
                      <td className="py-3 px-4 text-rose-300 font-mono">Shared Secret (1:N)</td>
                      <td className="py-3 px-4 text-emerald-300 font-mono">Private: 1, Public: N</td>
                      <td className="py-3 px-4 text-slate-400">
                        In HS256, if you have 30 microservices, 30 services must store the secret. With RS256, only 1 service holds the private key.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">2. Blast Radius on Breach</td>
                      <td className="py-3 px-4 text-rose-400 font-bold">Catastrophic (Total)</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">Compartmentalized (Zero)</td>
                      <td className="py-3 px-4 text-slate-400">
                        Compromising any single downstream microservice in HS256 grants the attacker cluster-wide admin token forgery. In RS256, it leaks zero signing ability.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">3. Key Rotation & Zero Downtime</td>
                      <td className="py-3 px-4 text-rose-300">High Risk & Synchronous</td>
                      <td className="py-3 px-4 text-emerald-300 font-semibold">Seamless via JWKS (`kid`)</td>
                      <td className="py-3 px-4 text-slate-400">
                        RS256 supports dynamic JWKS discovery (RFC 7517). Auth rotates keys; downstream services auto-fetch new public keys without restarts.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">4. 3rd-Party & External Clients</td>
                      <td className="py-3 px-4 text-rose-300">Dangerous / Impossible</td>
                      <td className="py-3 px-4 text-emerald-300 font-semibold">Native & Safe</td>
                      <td className="py-3 px-4 text-slate-400">
                        You can safely give external partners or frontend apps the RSA Public Key. You can never share an HS256 secret externally.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">5. Spring Security 6.4 Alignment</td>
                      <td className="py-3 px-4 text-slate-400">Legacy / Internal Monoliths</td>
                      <td className="py-3 px-4 text-indigo-400 font-semibold">Standard OAuth2 Resource Server</td>
                      <td className="py-3 px-4 text-slate-400">
                        <code className="text-slate-300">spring-boot-starter-oauth2-resource-server</code> natively configures <code className="text-slate-300">NimbusJwtDecoder.withPublicKey(...)</code> and JWKS URIs.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MICROSERVICE SIMULATOR                                             */}
        {/* ========================================================================= */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Play className="w-5 h-5 text-indigo-400" />
                    Interactive Microservice Pipeline Simulator
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Execute the end-to-end cryptographic lifecycle between <code className="text-indigo-300">auth-service</code> (8081) and <code className="text-emerald-300">resource-service</code> (8082).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Step {simStep} of 5</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(step => (
                      <div
                        key={step}
                        onClick={() => setSimStep(step)}
                        className={`w-6 h-6 rounded-full cursor-pointer flex items-center justify-center text-xs font-bold transition ${
                          simStep === step
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                            : simStep > step
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step Detail Content */}
              <div className="mt-6">
                {simStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">GET</span>
                        <code className="text-sm font-semibold text-slate-200">http://localhost:8081/.well-known/jwks.json</code>
                      </div>
                      <span className="text-xs text-slate-400">auth-service (Key Owner)</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Downstream microservices (or API gateways) discover public verification keys dynamically via RFC 7517.
                      The private key (<code className="text-rose-400">d, p, q</code>) is strictly withheld; only modulus (<code className="text-indigo-300">n</code>) and public exponent (<code className="text-indigo-300">e</code>) are exposed.
                    </p>
                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300">
                      {JSON.stringify(
                        {
                          keys: [
                            {
                              kty: 'RSA',
                              use: 'sig',
                              alg: 'RS256',
                              kid: 'rsa-auth-key-1',
                              n: activeJwk?.n || 'vXZ8...modulus...bytes',
                              e: activeJwk?.e || 'AQAB'
                            }
                          ]
                        },
                        null,
                        2
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setSimStep(2);
                          addLog('Step 1 Passed', 'JWKS inspected: Public Key modulus (n) & exponent (e) confirmed public.', 'success');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Next: User Login & RS256 Token Issuance <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {simStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-mono font-bold">POST</span>
                        <code className="text-sm font-semibold text-slate-200">http://localhost:8081/api/v1/auth/login</code>
                      </div>
                      <span className="text-xs text-slate-400">auth-service</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Request Payload</span>
                        <pre className="text-xs font-mono text-indigo-300 mt-2">
                          {JSON.stringify({ username: 'alice', password: 'password123' }, null, 2)}
                        </pre>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cryptographic Action</span>
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                          auth-service verifies credentials, constructs claims, and calculates an <span className="text-emerald-400 font-semibold">RS256 digital signature</span> using its locally held <code className="text-rose-400">private_key.pem</code>.
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-300">Issued RS256 Bearer JWT</span>
                        <button
                          onClick={() => copyToClipboard(simToken, 'sim-token')}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedFile === 'sim-token' ? 'Copied' : 'Copy Token'}
                        </button>
                      </div>
                      <p className="text-xs font-mono text-slate-300 break-all bg-slate-900 p-3 rounded border border-slate-800">
                        {simToken || 'Generating token...'}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <button
                        onClick={() => setSimStep(1)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          setSimStep(3);
                          addLog('Step 2 Passed', 'RS256 JWT issued and signed with RSA Private Key.', 'success');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Next: Test Unauthorized Request <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {simStep === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">GET</span>
                        <code className="text-sm font-semibold text-slate-200">http://localhost:8082/api/v1/data/secure-info</code>
                      </div>
                      <span className="text-xs text-slate-400">resource-service (Downstream)</span>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-rose-200">Zero-Trust Security Barrier</span>:
                        Attempting to call the protected resource endpoint without an <code className="bg-rose-950/60 px-1 py-0.5 rounded">Authorization: Bearer</code> header.
                        Spring Security 6.4 Resource Server instantly intercepts the request.
                      </div>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                      <div className="text-slate-400">HTTP/1.1 401 Unauthorized</div>
                      <div className="text-slate-400">WWW-Authenticate: Bearer error="unauthorized"</div>
                      <pre className="text-rose-400 mt-2">
                        {JSON.stringify(
                          {
                            timestamp: new Date().toISOString(),
                            status: 401,
                            error: 'Unauthorized',
                            message: 'Full authentication is required to access this resource',
                            path: '/api/v1/data/secure-info'
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                    <div className="flex justify-between">
                      <button onClick={() => setSimStep(2)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Back</button>
                      <button
                        onClick={() => {
                          setSimStep(4);
                          addLog('Step 3 Passed', 'Verified Spring Security 401 protection against unauthenticated requests.', 'info');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Next: Present Bearer Token to Resource Server <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {simStep === 4 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">GET</span>
                        <code className="text-sm font-semibold text-slate-200">http://localhost:8082/api/v1/data/secure-info</code>
                      </div>
                      <span className="text-xs text-slate-400">resource-service</span>
                    </div>
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs leading-relaxed flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-indigo-200">Stateless Offline Verification</span>:
                        <code className="text-white ml-1">resource-service</code> receives the Bearer token and verifies the RS256 signature using <strong>ONLY</strong> its local <code className="text-indigo-200">public_key.pem</code>.
                        <strong> ZERO network roundtrip</strong> to auth-service is required. The verification is purely mathematical: <code className="text-white">Signature^e mod n == Hash(Header.Payload)</code>.
                      </div>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                      <div className="text-emerald-400">HTTP/1.1 200 OK</div>
                      <pre className="text-emerald-300 mt-2">
                        {JSON.stringify(
                          {
                            message: 'Access granted to confidential resource-service domain! JWT verified statelessly using RSA Public Key.',
                            authenticatedSubject: 'alice',
                            issuer: 'http://localhost:8081',
                            authorities: ['ROLE_USER'],
                            verificationMethod: 'RSA RS256 Verification (Zero remote network roundtrip)',
                            tokenClaims: {
                              sub: 'alice',
                              iss: 'http://localhost:8081',
                              aud: 'resource-service',
                              roles: ['ROLE_USER'],
                              email: 'alice@security.demo'
                            },
                            timestamp: new Date().toISOString()
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                    <div className="flex justify-between">
                      <button onClick={() => setSimStep(3)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Back</button>
                      <button
                        onClick={() => {
                          setSimStep(5);
                          addLog('Step 4 Passed', 'Stateless JWT signature validated locally via RSAPublicKey bean.', 'success');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Next: Downstream-to-Upstream Encrypted Payload <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {simStep === 5 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-mono font-bold">ASYMMETRIC FLOW</span>
                        <code className="text-sm font-semibold text-slate-200">SecureCryptoClient (8082) → auth-service /decrypt (8081)</code>
                      </div>
                      <span className="text-xs text-slate-400">Confidentiality Guarantee</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                          <Lock className="w-4 h-4" />
                          Downstream Client Encryption (Public Key)
                        </div>
                        <p className="text-xs text-slate-400">
                          resource-service encrypts sensitive data with auth-service's public key before transmitting over HTTP.
                        </p>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-slate-300 break-all max-h-24 overflow-y-auto">
                          {simCiphertext}
                        </div>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <Unlock className="w-4 h-4" />
                          Upstream JCA Decryption (Private Key)
                        </div>
                        <p className="text-xs text-slate-400">
                          auth-service receives the ciphertext at <code className="text-slate-300">/api/v1/crypto/decrypt</code> and decrypts using its JCA Private Key.
                        </p>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-emerald-400">
                          {simDecrypted || 'Decrypted: "Confidential Account Transfer #948271: $75,000"'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <button onClick={() => setSimStep(4)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Back</button>
                      <button
                        onClick={() => {
                          setSimDecrypted('Decrypted: "' + plaintextInput + '"');
                          addLog('Step 5 Executed', 'Successfully decrypted downstream payload using auth-service private key', 'success');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Run JCA Decryption Test
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Microservice Live Event Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Live Cryptographic & Network Event Log
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {simLog.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs p-2 rounded bg-slate-950/50 border border-slate-800/80">
                    <span className="font-mono text-slate-500 text-[10px] whitespace-nowrap mt-0.5">{log.time}</span>
                    <div className="flex-1">
                      <span className={`font-semibold ${
                        log.status === 'success' ? 'text-emerald-400' : log.status === 'warn' ? 'text-amber-400' : 'text-indigo-400'
                      }`}>
                        {log.title}:
                      </span>{' '}
                      <span className="text-slate-300">{log.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ARCHITECTURE & CRYPTOGRAPHIC FLOW                                  */}
        {/* ========================================================================= */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Service Topology Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-400" />
                    Microservice Topology & Key Distribution
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Multi-Module Maven
                  </span>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-300">1. auth-service (Port 8081)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                        Holds Private + Public Keys
                      </span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>Holds <code className="text-rose-400">private_key.pem</code> (PKCS#8 2048-bit RSA)</li>
                      <li>POST <code className="text-indigo-300">/api/v1/auth/login</code>: Signs JWT with RS256</li>
                      <li>GET <code className="text-indigo-300">/.well-known/jwks.json</code>: Serves RFC 7517 Public Key</li>
                      <li>POST <code className="text-indigo-300">/api/v1/crypto/decrypt</code>: Decrypts with Private Key JCA</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-300">2. resource-service (Port 8082)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        Holds Public Key ONLY
                      </span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>Holds <code className="text-emerald-400">public_key.pem</code> (X.509 SPKI format)</li>
                      <li>Uses Spring Boot <code className="text-emerald-300">oauth2-resource-server</code></li>
                      <li>Stateless signature validation (zero network calls to auth-service)</li>
                      <li>Helper <code className="text-emerald-300">SecureCryptoClient</code> encrypts payloads before transmitting</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300">3. crypto-common</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        Shared Library
                      </span>
                    </div>
                    <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                      <li><code className="text-slate-300">PemKeyUtils.java</code>: KeyFactory PKCS#8 & X.509 PEM parser</li>
                      <li><code className="text-slate-300">RsaCryptoService.java</code>: RSA-OAEP SHA-256 JCA Cipher</li>
                      <li><code className="text-slate-300">RsaKeyProperties.java</code>: @ConfigurationProperties binder</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* RSA Cryptographic Theory & Protection Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  Asymmetric Cryptography Core Principles
                </h3>

                <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-semibold text-indigo-300">Mathematical RSA Key Pair Generation</span>
                    <p className="text-slate-400">
                      1. Pick distinct primes <code className="text-indigo-300">p</code> and <code className="text-indigo-300">q</code>.<br/>
                      2. Modulus <code className="text-indigo-300">n = p × q</code> (2048 bits for enterprise grade).<br/>
                      3. Euler Totient <code className="text-indigo-300">φ(n) = (p-1)(q-1)</code>.<br/>
                      4. Public Exponent <code className="text-indigo-300">e = 65537</code> (Fermat prime F4).<br/>
                      5. Private Exponent <code className="text-indigo-300">d ≡ e⁻¹ (mod φ(n))</code>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-semibold text-emerald-300">The Two Faces of Asymmetric RSA</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                        <span className="text-white font-medium block mb-1">Digital Signatures (RS256)</span>
                        <p className="text-[11px] text-slate-400">
                          Sign with <strong>Private Key</strong>, verify with <strong>Public Key</strong>.<br/>
                          Guarantees authenticity & non-repudiation.
                        </p>
                      </div>
                      <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                        <span className="text-white font-medium block mb-1">Payload Confidentiality (OAEP)</span>
                        <p className="text-[11px] text-slate-400">
                          Encrypt with <strong>Public Key</strong>, decrypt with <strong>Private Key</strong>.<br/>
                          Guarantees strict confidentiality.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                    <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-300">
                      <ShieldCheck className="w-4 h-4" /> Why RSA-OAEP instead of PKCS#1 v1.5?
                    </span>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      PKCS#1 v1.5 padding is vulnerable to <em>Bleichenbacher's Million Message Attack</em> (padding oracle attack).
                      <strong> RSA-OAEP (Optimal Asymmetric Encryption Padding) with SHA-256 and MGF1</strong> is provably IND-CCA2 secure
                      and mandated by NIST SP 800-56B and OWASP.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LIVE CRYPTOGRAPHY LAB                                              */}
        {/* ========================================================================= */}
        {activeTab === 'crypto-lab' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  Live RSA Cryptographic Playground (Browser WebCrypto)
                </h3>
                <p className="text-xs text-slate-400">Test actual RSA-2048 operations directly in memory</p>
              </div>
              <button
                onClick={initCryptoLab}
                disabled={keyPairLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${keyPairLoading ? 'animate-spin' : ''}`} />
                {keyPairLoading ? 'Regenerating 2048-bit Key Pair...' : 'Regenerate New RSA Keys'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RS256 JWT Signing & Dynamic Verification */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    RS256 JWT Issuance & Verification
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                    auth-service ⇄ resource-service
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Subject (Username)</label>
                      <input
                        type="text"
                        value={jwtSubject}
                        onChange={e => setJwtSubject(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Role Claim</label>
                      <select
                        value={jwtRole}
                        onChange={e => setJwtRole(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      >
                        <option value="ROLE_USER">ROLE_USER</option>
                        <option value="ROLE_ADMIN">ROLE_ADMIN</option>
                        <option value="ROLE_OPERATOR">ROLE_OPERATOR</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSignJwt}
                      className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Key className="w-3.5 h-3.5" /> Sign with Private Key
                    </button>
                    <button
                      onClick={handleVerifyJwt}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Verify with Public Key
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Current JWT (Compact Serialization)</label>
                    <textarea
                      rows={3}
                      value={generatedJwt}
                      onChange={e => setGeneratedJwt(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {verificationResult && (
                    <div className={`p-3 rounded-xl border text-xs ${
                      verificationResult.valid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                      <div className="font-bold flex items-center gap-1.5">
                        {verificationResult.valid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {verificationResult.valid ? 'Signature Validated Successfully!' : 'Verification Failed'}
                      </div>
                      {verificationResult.valid && (
                        <div className="mt-2 text-[11px] space-y-1">
                          <div><strong>Issuer:</strong> {verificationResult.payload?.iss}</div>
                          <div><strong>Subject:</strong> {verificationResult.payload?.sub}</div>
                          <div><strong>Roles:</strong> {JSON.stringify(verificationResult.payload?.roles)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RSA-OAEP Asymmetric Encryption & Decryption */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    RSA-OAEP SHA-256 Encryption & Decryption
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                    JCA Cipher
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Plaintext Message</label>
                    <input
                      type="text"
                      value={plaintextInput}
                      onChange={e => setPlaintextInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleEncryptOaep}
                      className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Lock className="w-3.5 h-3.5" /> Encrypt with Public Key
                    </button>
                    <button
                      onClick={handleDecryptOaep}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Decrypt with Private Key
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Base64 RSA-OAEP Ciphertext</label>
                    <textarea
                      rows={3}
                      value={encryptedCiphertext}
                      onChange={e => setEncryptedCiphertext(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {decryptedPlaintext && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                      <span className="font-bold block mb-1">Decrypted Output:</span>
                      <p className="font-mono text-white bg-slate-950 p-2 rounded">{decryptedPlaintext}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* In-Memory PEM Keys Inspection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400">RSA Public Key (X.509 SubjectPublicKeyInfo)</span>
                  <button
                    onClick={() => copyToClipboard(generatedPubPem, 'pub-pem')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedFile === 'pub-pem' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-emerald-300/90 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-40 overflow-y-auto">
                  {generatedPubPem}
                </pre>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-400">RSA Private Key (PKCS#8 Encoded - Confidential)</span>
                  <button
                    onClick={() => copyToClipboard(generatedPrivPem, 'priv-pem')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedFile === 'priv-pem' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-rose-300/90 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-40 overflow-y-auto">
                  {generatedPrivPem}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CODEBASE EXPLORER                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'codebase' && (
          <div className="space-y-4">
            {/* Filter and Download Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs text-slate-400 font-semibold mr-1">Filter Module:</span>
                {[
                  { id: 'all', label: 'All Files' },
                  { id: 'auth-service', label: 'auth-service' },
                  { id: 'resource-service', label: 'resource-service' },
                  { id: 'crypto-common', label: 'crypto-common' },
                  { id: 'scripts', label: 'scripts' },
                  { id: 'root', label: 'root' },
                ].map(mod => (
                  <button
                    key={mod.id}
                    onClick={() => setModuleFilter(mod.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      moduleFilter === mod.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mod.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleDownloadZip}
                disabled={downloadingZip}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {downloadingZip ? 'Packaging Zip...' : 'Download Maven Project (.zip)'}
              </button>
            </div>

            {/* File Explorer Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
              {/* File Tree Left Pane */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-2 max-h-[750px] overflow-y-auto">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                  <span>Project Explorer</span>
                  <span className="text-[10px] text-slate-500">{filteredFiles.length} files</span>
                </div>

                <div className="space-y-1">
                  {filteredFiles.map(file => {
                    const isSelected = selectedFile.path === file.path;
                    return (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${
                          isSelected ? 'text-white' : 'text-slate-400'
                        }`} />
                        <div className="truncate flex-1">
                          <div className="truncate">{file.name}</div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                            {file.path}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Code Viewer Right Pane */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
                {/* Code Header */}
                <div className="border-b border-slate-800 bg-slate-950 px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-indigo-400" />
                      {selectedFile.path}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedFile.description}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(FILE_CONTENTS[selectedFile.path] || '', selectedFile.path)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                  >
                    {copiedFile === selectedFile.path ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code Editor Preview */}
                <div className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-auto max-h-[700px]">
                  <pre className="text-slate-300 leading-relaxed">
                    {FILE_CONTENTS[selectedFile.path] || '// File content not loaded'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CLI & RUNBOOK                                                      */}
        {/* ========================================================================= */}
        {activeTab === 'runbook' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Build and Run */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Building & Launching with Maven
                </h3>
                <p className="text-xs text-slate-400">
                  Compile all 3 modules in one command using the parent POM:
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 space-y-2">
                  <div className="text-slate-500"># 1. Compile parent and all child modules</div>
                  <div>mvn clean package -DskipTests</div>
                  <div className="text-slate-500 pt-2"># 2. Run both microservices via shell script</div>
                  <div>./scripts/run-services.sh</div>
                  <div className="text-slate-500 pt-2"># Or run each service independently:</div>
                  <div>java -jar auth-service/target/auth-service-1.0.0-SNAPSHOT.jar</div>
                  <div>java -jar resource-service/target/resource-service-1.0.0-SNAPSHOT.jar</div>
                </div>
              </div>

              {/* OpenSSL Key Generation */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  OpenSSL PKCS#8 & X.509 Key Generation
                </h3>
                <p className="text-xs text-slate-400">
                  Java 17 KeyFactory requires PKCS#8 format (<code className="text-slate-300">BEGIN PRIVATE KEY</code>):
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-indigo-300 space-y-2">
                  <div className="text-slate-500"># Generate 2048-bit Private Key in PKCS#8</div>
                  <div>openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private_key.pem</div>
                  <div className="text-slate-500 pt-2"># Extract Public Key in X.509 SPKI</div>
                  <div>openssl pkey -in private_key.pem -pubout -out public_key.pem</div>
                  <div className="text-slate-500 pt-2"># Inspect ASN.1 DER structure</div>
                  <div>openssl asn1parse -in private_key.pem</div>
                </div>
              </div>
            </div>

            {/* Docker Compose Runbook */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-violet-400" />
                Containerized Execution (Docker Compose)
              </h3>
              <p className="text-xs text-slate-400">
                Launch both microservices inside isolated network bridge containers:
              </p>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 space-y-1">
                <div>docker compose up --build</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 px-4 lg:px-8 py-4 text-center text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-2">
        <span>Principal Software Engineer Reference Architecture • Asymmetric Key Cryptography (RSA)</span>
        <div className="flex items-center gap-4">
          <span>Java 17</span>
          <span>Spring Boot 3.4.0</span>
          <span>Spring Security 6.4</span>
          <span>Nimbus JOSE</span>
        </div>
      </footer>
    </div>
  );
}
