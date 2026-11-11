import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  Check,
  Code2,
  Copy,
  Download,
  FileJson,
  Globe,
  Layers,
  Plus,
  Power,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  BodyRule,
  BodyRuleMode,
  ExtensionState,
  HeaderOperation,
  HeaderRule,
  HeaderTarget,
  Profile,
  RedirectCorsRule,
  TelepresenceConfig,
} from './types/extension';
import {
  extApi,
  INITIAL_STATE,
  loadExtensionState,
  saveExtensionState,
} from './utils/browser';

type TabType = 'telepresence' | 'headers' | 'body' | 'redirect_cors' | 'logs';

const HEADER_PRESETS = [
  { name: 'x-telepresence-intercept-id', value: 'intercept-id-here', comment: 'Telepresence Intercept' },
  { name: 'baggage', value: 'telepresence-intercept-id=intercept-id-here', comment: 'OTel Baggage' },
  { name: 'Authorization', value: 'Bearer eyJhbGciOi...', comment: 'JWT Token' },
  { name: 'x-forwarded-for', value: '127.0.0.1', comment: 'Spoof Client IP' },
  { name: 'x-debug-mode', value: 'true', comment: 'Debug Header' },
  { name: 'Cache-Control', value: 'no-cache, no-store', comment: 'Bypass Cache' },
];

export default function App() {
  const [state, setState] = useState<ExtensionState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<TabType>('telepresence');
  const [cliPasteText, setCliPasteText] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showNewProfileInput, setShowNewProfileInput] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  useEffect(() => {
    loadExtensionState().then((loaded) => {
      setState(loaded);
    });
  }, []);

  const triggerToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 2200);
  };

  const updateState = (updater: (prev: ExtensionState) => ExtensionState) => {
    setState((prev) => {
      const next = updater(prev);
      saveExtensionState(next);
      return next;
    });
  };

  const activeProfile: Profile =
    state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];

  const updateActiveProfile = (updater: (prof: Profile) => Profile) => {
    updateState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === activeProfile.id ? updater(p) : p
      ),
    }));
  };

  // Telepresence CLI output parser (extracts x-telepresence-intercept-id automatically)
  const handleParseTelepresenceCli = (raw: string) => {
    setCliPasteText(raw);
    const match =
      raw.match(/x-telepresence-intercept-id\s*[:=]\s*([^\s,"']+)/i) ||
      raw.match(/telepresence-intercept-id\s*[:=]\s*([^\s,"']+)/i) ||
      raw.match(/Intercept ID\s*[:=]\s*([^\s,"']+)/i);

    const extractedId = match ? match[1].trim() : raw.trim();
    if (extractedId) {
      updateActiveProfile((prof) => ({
        ...prof,
        telepresence: {
          ...prof.telepresence,
          enabled: true,
          interceptId: extractedId,
          baggageHeader: `telepresence-intercept-id=${extractedId}`,
        },
      }));
      triggerToast('Telepresence Intercept ID uygulandı!');
    }
  };

  const updateTelepresence = (patch: Partial<TelepresenceConfig>) => {
    updateActiveProfile((prof) => ({
      ...prof,
      telepresence: {
        ...prof.telepresence,
        ...patch,
      },
    }));
  };

  // Header Rules Handlers
  const addHeaderRule = (preset?: { name: string; value: string; comment?: string }) => {
    const newRule: HeaderRule = {
      id: `hdr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      enabled: true,
      name: preset?.name || '',
      value: preset?.value || '',
      operation: 'set',
      target: 'request',
      urlFilter: '*',
      comment: preset?.comment || '',
    };
    updateActiveProfile((prof) => ({
      ...prof,
      headerRules: [newRule, ...prof.headerRules],
    }));
  };

  const updateHeaderRule = (id: string, patch: Partial<HeaderRule>) => {
    updateActiveProfile((prof) => ({
      ...prof,
      headerRules: prof.headerRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const deleteHeaderRule = (id: string) => {
    updateActiveProfile((prof) => ({
      ...prof,
      headerRules: prof.headerRules.filter((r) => r.id !== id),
    }));
  };

  // Body Rules Handlers
  const addBodyRule = () => {
    const newRule: BodyRule = {
      id: `body-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      enabled: true,
      name: 'Yeni Body Manipülasyonu',
      urlPattern: '/api/',
      isRegex: false,
      method: 'ALL',
      mode: 'merge_response_json',
      statusCode: 200,
      delayMs: 0,
      contentType: 'application/json',
      bodyContent: '{\n  "manipulated": true\n}',
    };
    updateActiveProfile((prof) => ({
      ...prof,
      bodyRules: [newRule, ...prof.bodyRules],
    }));
  };

  const updateBodyRule = (id: string, patch: Partial<BodyRule>) => {
    updateActiveProfile((prof) => ({
      ...prof,
      bodyRules: prof.bodyRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const deleteBodyRule = (id: string) => {
    updateActiveProfile((prof) => ({
      ...prof,
      bodyRules: prof.bodyRules.filter((r) => r.id !== id),
    }));
  };

  // Redirect & CORS Rules Handlers
  const addRedirectCorsRule = (type: 'redirect' | 'cors_bypass') => {
    const newRule: RedirectCorsRule = {
      id: `rc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      enabled: true,
      name: type === 'cors_bypass' ? 'CORS Bypass Kuralı' : 'Localhost Yönlendirme',
      type,
      sourceUrlFilter: type === 'cors_bypass' ? '*' : '^https://api\\.ornek\\.com/(.*)',
      destinationUrl: type === 'redirect' ? 'http://localhost:8080/\\1' : '',
    };
    updateActiveProfile((prof) => ({
      ...prof,
      redirectCorsRules: [newRule, ...prof.redirectCorsRules],
    }));
  };

  const updateRedirectCorsRule = (id: string, patch: Partial<RedirectCorsRule>) => {
    updateActiveProfile((prof) => ({
      ...prof,
      redirectCorsRules: prof.redirectCorsRules.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    }));
  };

  const deleteRedirectCorsRule = (id: string) => {
    updateActiveProfile((prof) => ({
      ...prof,
      redirectCorsRules: prof.redirectCorsRules.filter((r) => r.id !== id),
    }));
  };

  // Profile Management
  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;
    const newProf: Profile = {
      id: `prof-${Date.now()}`,
      name: newProfileName.trim(),
      color: '#ec4899',
      telepresence: {
        enabled: false,
        interceptId: '',
        baggageHeader: '',
        customHeaderName: '',
        customHeaderValue: '',
        targetDomainFilter: '*',
        propagateBaggage: true,
        envoyForceTrace: false,
      },
      headerRules: [],
      bodyRules: [],
      redirectCorsRules: [],
    };
    updateState((prev) => ({
      ...prev,
      activeProfileId: newProf.id,
      profiles: [...prev.profiles, newProf],
    }));
    setNewProfileName('');
    setShowNewProfileInput(false);
    triggerToast(`"${newProf.name}" profili oluşturuldu`);
  };

  // Export / Import JSON
  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'dev-manipulator-config.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast('Ayarlar JSON olarak indirildi');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result));
        if (parsed && Array.isArray(parsed.profiles)) {
          updateState(() => parsed);
          triggerToast('Ayarlar başarıyla içe aktarıldı!');
        }
      } catch {
        triggerToast('Geçersiz JSON dosyası!');
      }
    };
    reader.readAsText(file);
  };

  const reloadActiveTab = async () => {
    if (extApi?.tabs) {
      const [tab] = await extApi.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        extApi.tabs.reload(tab.id);
        triggerToast('Aktif sekme yenilendi');
      }
    }
  };

  const refreshLogs = async () => {
    const fresh = await loadExtensionState();
    setState(fresh);
  };

  const clearLogs = () => {
    updateState((prev) => ({ ...prev, logs: [] }));
  };

  const activeHeaderCount = activeProfile.headerRules.filter(
    (r) => r.enabled && r.name.trim()
  ).length;
  const activeBodyCount = activeProfile.bodyRules.filter(
    (r) => r.enabled && r.urlPattern.trim()
  ).length;
  const activeRedirectCount = activeProfile.redirectCorsRules.filter(
    (r) => r.enabled
  ).length;
  const tpActive =
    activeProfile.telepresence.enabled &&
    Boolean(
      activeProfile.telepresence.interceptId.trim() ||
        activeProfile.telepresence.baggageHeader.trim() ||
        (activeProfile.telepresence.customHeaderName.trim() &&
          activeProfile.telepresence.customHeaderValue.trim()) ||
        activeProfile.telepresence.envoyForceTrace
    );

  return (
    <div className="flex flex-col h-[600px] bg-slate-950 text-slate-100 select-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner transition-colors ${
              state.globalEnabled
                ? 'bg-indigo-600 text-white shadow-indigo-500/30'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">
                DevManipulator
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                MV3 Yasal & Resmi
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Telepresence • Header • Body • CORS (Chrome / Edge / Firefox)
            </p>
          </div>
        </div>

        {/* Profile Selector & Power Button */}
        <div className="flex items-center gap-2">
          {showNewProfileInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profil adı..."
                className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-indigo-500 w-28"
              />
              <button
                onClick={handleCreateProfile}
                className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white font-medium"
              >
                Ekle
              </button>
              <button
                onClick={() => setShowNewProfileInput(false)}
                className="px-1.5 py-1 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2 py-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={activeProfile.id}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    activeProfileId: e.target.value,
                  }))
                }
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
              >
                {state.profiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewProfileInput(true)}
                title="Yeni Profil Oluştur"
                className="ml-1 text-slate-400 hover:text-indigo-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={reloadActiveTab}
            title="Aktif Sekmeyi Yenile"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() =>
              updateState((prev) => ({
                ...prev,
                globalEnabled: !prev.globalEnabled,
              }))
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              state.globalEnabled
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {state.globalEnabled ? 'AKTİF' : 'KAPALI'}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex items-center justify-between px-4 bg-slate-900/50 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('telepresence')}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition-colors ${
              activeTab === 'telepresence'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Telepresence</span>
            {tpActive && (
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('headers')}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition-colors ${
              activeTab === 'headers'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Headers</span>
            {activeHeaderCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300">
                {activeHeaderCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('body')}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition-colors ${
              activeTab === 'body'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Body (Req/Res)</span>
            {activeBodyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300">
                {activeBodyCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('redirect_cors')}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition-colors ${
              activeTab === 'redirect_cors'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>CORS & Redirect</span>
            {activeRedirectCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300">
                {activeRedirectCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('logs');
              refreshLogs();
            }}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition-colors ${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Canlı Log</span>
            {state.logs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {state.logs.length}
              </span>
            )}
          </button>
        </div>

        {/* Export / Import */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleExportJson}
            title="Ayarları JSON Olarak İndir"
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <label
            title="JSON Ayar Dosyası Yükle"
            className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {!state.globalEnabled && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <span>
              Eklenti şu an genel olarak devre dışı. Hiçbir header veya body manipülasyonu uygulanmıyor.
            </span>
            <button
              onClick={() =>
                updateState((prev) => ({ ...prev, globalEnabled: true }))
              }
              className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400"
            >
              Şimdi Aç
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 1: TELEPRESENCE INTERCEPTHUB                                    */}
        {/* =================================================================== */}
        {activeTab === 'telepresence' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Telepresence & Kubernetes Intercept Modülü
                  </h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-slate-300">Telepresence Modu</span>
                  <input
                    type="checkbox"
                    checked={activeProfile.telepresence.enabled}
                    onChange={(e) =>
                      updateTelepresence({ enabled: e.target.checked })
                    }
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Terminalde <code className="text-indigo-300">telepresence intercept</code> çalıştırdığında
                sana verilen <code className="text-indigo-300">x-telepresence-intercept-id</code> değerini
                aşağıya gir. Tarayıcıdan çıkan tüm API ve sayfa isteklerine otomatik olarak ağ seviyesinde
                eklenir ve trafiğin direkt kendi bilgisayarındaki pod/servise yönlenir.
              </p>

              {/* Quick Paste Box */}
              <div className="pt-1">
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Hızlı CLI Yapıştırıcı (İsteğe bağlı: Terminal çıktısını buraya yapıştır, ID otomatik çekilsin)
                </label>
                <input
                  type="text"
                  value={cliPasteText}
                  onChange={(e) => handleParseTelepresenceCli(e.target.value)}
                  placeholder="Örn: x-telepresence-intercept-id: 9842a1b2-c3d4...:my-service"
                  className="w-full px-3 py-1.5 text-xs bg-slate-950/90 border border-slate-700/80 rounded-lg text-indigo-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Core Telepresence Fields */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    x-telepresence-intercept-id
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={activeProfile.telepresence.interceptId}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateTelepresence({
                          interceptId: val,
                          baggageHeader: val ? `telepresence-intercept-id=${val}` : '',
                        });
                      }}
                      placeholder="Örn: 12345-abcde:auth-service"
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          activeProfile.telepresence.interceptId
                        );
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 1500);
                      }}
                      title="Kopyala"
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300"
                    >
                      {copiedId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Hedef Domain / URL Filtresi (<code className="text-indigo-300">*</code> = Tümü)
                  </label>
                  <input
                    type="text"
                    value={activeProfile.telepresence.targetDomainFilter}
                    onChange={(e) =>
                      updateTelepresence({ targetDomainFilter: e.target.value })
                    }
                    placeholder="* veya *://*.sirket.com/*"
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* OpenTelemetry Baggage & Custom Header */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    W3C OpenTelemetry <code className="text-indigo-300">baggage</code> Header
                  </label>
                  <input
                    type="text"
                    value={activeProfile.telepresence.baggageHeader}
                    onChange={(e) =>
                      updateTelepresence({ baggageHeader: e.target.value })
                    }
                    placeholder="telepresence-intercept-id=..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Ekstra Header Adı
                    </label>
                    <input
                      type="text"
                      value={activeProfile.telepresence.customHeaderName}
                      onChange={(e) =>
                        updateTelepresence({ customHeaderName: e.target.value })
                      }
                      placeholder="x-dev-user"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Ekstra Header Değeri
                    </label>
                    <input
                      type="text"
                      value={activeProfile.telepresence.customHeaderValue}
                      onChange={(e) =>
                        updateTelepresence({ customHeaderValue: e.target.value })
                      }
                      placeholder="yasir-local"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={activeProfile.telepresence.propagateBaggage}
                    onChange={(e) =>
                      updateTelepresence({ propagateBaggage: e.target.checked })
                    }
                    className="accent-indigo-500 rounded"
                  />
                  <span>
                    Mikroservisler arası <code className="text-indigo-300">baggage</code> yayılımını otomatik ekle
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={activeProfile.telepresence.envoyForceTrace}
                    onChange={(e) =>
                      updateTelepresence({ envoyForceTrace: e.target.checked })
                    }
                    className="accent-indigo-500 rounded"
                  />
                  <span>
                    <code className="text-indigo-300">x-envoy-force-trace: true</code> ekle
                  </span>
                </label>
              </div>
            </div>

            {/* Active Telepresence Preview Card */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Şu An İsteklere Enjekte Edilen Telepresence Başlıkları
                </span>
                <span className="text-[11px] text-slate-400">
                  Filtre: <code className="text-indigo-300">{activeProfile.telepresence.targetDomainFilter || '*'}</code>
                </span>
              </div>

              <div className="bg-slate-950 rounded-lg p-2.5 font-mono text-[11px] space-y-1 border border-slate-800/80">
                {!activeProfile.telepresence.enabled ? (
                  <p className="text-slate-500">Telepresence modu kapalı.</p>
                ) : (
                  <>
                    {activeProfile.telepresence.interceptId.trim() ? (
                      <div className="text-emerald-400">
                        x-telepresence-intercept-id: {activeProfile.telepresence.interceptId.trim()}
                      </div>
                    ) : (
                      <div className="text-amber-400/80">
                        ⚠ Henüz x-telepresence-intercept-id girilmedi (Yukarıdaki kutuya ID yazın)
                      </div>
                    )}
                    {(activeProfile.telepresence.propagateBaggage &&
                      activeProfile.telepresence.interceptId.trim()) ||
                    activeProfile.telepresence.baggageHeader.trim() ? (
                      <div className="text-indigo-300">
                        baggage:{' '}
                        {activeProfile.telepresence.baggageHeader.trim() ||
                          `telepresence-intercept-id=${activeProfile.telepresence.interceptId.trim()}`}
                      </div>
                    ) : null}
                    {activeProfile.telepresence.customHeaderName.trim() &&
                      activeProfile.telepresence.customHeaderValue.trim() && (
                        <div className="text-sky-300">
                          {activeProfile.telepresence.customHeaderName.trim()}:{' '}
                          {activeProfile.telepresence.customHeaderValue.trim()}
                        </div>
                      )}
                    {activeProfile.telepresence.envoyForceTrace && (
                      <div className="text-purple-300">x-envoy-force-trace: true</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: REQUEST & RESPONSE HEADERS MANIPULATION                      */}
        {/* =================================================================== */}
        {activeTab === 'headers' && (
          <div className="space-y-3">
            {/* Presets Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">Hazır Ekle:</span>
                {HEADER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => addHeaderRule(preset)}
                    className="px-2 py-1 text-[11px] rounded-md bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500/50 text-slate-300 border border-slate-700 transition-colors"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => addHeaderRule()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                Yeni Header Kuralı
              </button>
            </div>

            {/* Header Rules List */}
            {activeProfile.headerRules.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                Henüz özel bir header kuralı yok. Yukarıdan yeni bir kural veya şablon ekleyebilirsin.
              </div>
            ) : (
              <div className="space-y-2">
                {activeProfile.headerRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3 rounded-xl border transition-colors space-y-2 ${
                      rule.enabled
                        ? 'bg-slate-900 border-slate-700/80'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, { enabled: e.target.checked })
                        }
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                      />

                      <select
                        value={rule.target}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, {
                            target: e.target.value as HeaderTarget,
                          })
                        }
                        className="px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-indigo-300 font-medium"
                      >
                        <option value="request">Req (İstek)</option>
                        <option value="response">Res (Yanıt)</option>
                      </select>

                      <select
                        value={rule.operation}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, {
                            operation: e.target.value as HeaderOperation,
                          })
                        }
                        className="px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-200"
                      >
                        <option value="set">Set (Üzerine Yaz)</option>
                        <option value="append">Append (Ekle)</option>
                        <option value="remove">Remove (Sil)</option>
                      </select>

                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, { name: e.target.value })
                        }
                        placeholder="Header Adı (Örn: x-telepresence-intercept-id)"
                        className="flex-1 px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-white font-mono focus:outline-none focus:border-indigo-500"
                      />

                      <button
                        onClick={() => deleteHeaderRule(rule.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Kuralı Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pl-6">
                      {rule.operation !== 'remove' && (
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={rule.value}
                            onChange={(e) =>
                              updateHeaderRule(rule.id, { value: e.target.value })
                            }
                            placeholder="Header Değeri (Value)"
                            className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-emerald-300 font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}
                      <div className={rule.operation === 'remove' ? 'col-span-3' : 'col-span-1'}>
                        <input
                          type="text"
                          value={rule.urlFilter}
                          onChange={(e) =>
                            updateHeaderRule(rule.id, { urlFilter: e.target.value })
                          }
                          placeholder="URL Filtresi (* = Tümü)"
                          className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: REQUEST & RESPONSE BODY MANIPULATION                         */}
        {/* =================================================================== */}
        {activeTab === 'body' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-xs font-semibold text-white">
                  Fetch & XHR Body Manipülasyonu (Request & Response)
                </h3>
                <p className="text-[11px] text-slate-400">
                  API yanıtlarını (Response Body) değiştirebilir, JSON alanı ekleyebilir veya giden POST/PUT Body verisini manipüle edebilirsin.
                </p>
              </div>
              <button
                onClick={addBodyRule}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Yeni Body Kuralı
              </button>
            </div>

            {activeProfile.bodyRules.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                Henüz bir Body manipülasyon kuralı yok.
              </div>
            ) : (
              <div className="space-y-3">
                {activeProfile.bodyRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-xl border space-y-2.5 ${
                      rule.enabled
                        ? 'bg-slate-900 border-slate-700'
                        : 'bg-slate-900/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) =>
                            updateBodyRule(rule.id, { enabled: e.target.checked })
                          }
                          className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={rule.name}
                          onChange={(e) =>
                            updateBodyRule(rule.id, { name: e.target.value })
                          }
                          placeholder="Kural Adı"
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-950 border border-slate-700 rounded-md text-white focus:outline-none focus:border-indigo-500"
                        />

                        <select
                          value={rule.mode}
                          onChange={(e) =>
                            updateBodyRule(rule.id, {
                              mode: e.target.value as BodyRuleMode,
                            })
                          }
                          className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-indigo-300 font-medium"
                        >
                          <option value="merge_response_json">
                            Response JSON Birleştir (Merge)
                          </option>
                          <option value="replace_response">
                            Response Body Tamamen Değiştir (Mock)
                          </option>
                          <option value="merge_request_json">
                            Request JSON Birleştir (Giden İstek)
                          </option>
                          <option value="replace_request">
                            Request Body Tamamen Değiştir
                          </option>
                        </select>
                      </div>

                      <button
                        onClick={() => deleteBodyRule(rule.id)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          Metod
                        </label>
                        <select
                          value={rule.method}
                          onChange={(e) =>
                            updateBodyRule(rule.id, {
                              method: e.target.value as BodyRule['method'],
                            })
                          }
                          className="w-full px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-200"
                        >
                          <option value="ALL">ALL</option>
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="PATCH">PATCH</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>

                      <div className="col-span-6">
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          URL Eşleşme Deseni (Substring veya Wildcard *)
                        </label>
                        <input
                          type="text"
                          value={rule.urlPattern}
                          onChange={(e) =>
                            updateBodyRule(rule.id, { urlPattern: e.target.value })
                          }
                          placeholder="Örn: /api/v1/user veya *://*.sirket.com/api/*"
                          className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-white font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          HTTP Status
                        </label>
                        <input
                          type="number"
                          value={rule.statusCode || 200}
                          onChange={(e) =>
                            updateBodyRule(rule.id, {
                              statusCode: Number(e.target.value) || 200,
                            })
                          }
                          className="w-full px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-emerald-300 font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          Gecikme (ms)
                        </label>
                        <input
                          type="number"
                          value={rule.delayMs || 0}
                          onChange={(e) =>
                            updateBodyRule(rule.id, {
                              delayMs: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-amber-300 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-400">
                          Manipüle Edilecek JSON / Text İçeriği
                        </label>
                        <button
                          onClick={() => {
                            try {
                              const formatted = JSON.stringify(
                                JSON.parse(rule.bodyContent),
                                null,
                                2
                              );
                              updateBodyRule(rule.id, { bodyContent: formatted });
                            } catch {
                              triggerToast('Geçerli bir JSON değil');
                            }
                          }}
                          className="text-[10px] text-indigo-400 hover:underline"
                        >
                          JSON Formatla
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={rule.bodyContent}
                        onChange={(e) =>
                          updateBodyRule(rule.id, { bodyContent: e.target.value })
                        }
                        className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-emerald-300 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CORS BYPASS & URL REDIRECT                                   */}
        {/* =================================================================== */}
        {activeTab === 'redirect_cors' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-xs font-semibold text-white">
                  CORS Unblock & Localhost URL Yönlendirme
                </h3>
                <p className="text-[11px] text-slate-400">
                  Canlı ortamdaki API isteklerini localhost&apos;a yönlendirebilir veya CORS hatalarını kaldırabilirsin.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addRedirectCorsRule('cors_bypass')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium"
                >
                  <Globe className="w-3.5 h-3.5" />+ CORS Bypass
                </button>
                <button
                  onClick={() => addRedirectCorsRule('redirect')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />+ URL Redirect
                </button>
              </div>
            </div>

            {activeProfile.redirectCorsRules.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                Henüz bir CORS veya Yönlendirme kuralı eklenmedi.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeProfile.redirectCorsRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3 rounded-xl border space-y-2 ${
                      rule.enabled
                        ? 'bg-slate-900 border-slate-700'
                        : 'bg-slate-900/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) =>
                            updateRedirectCorsRule(rule.id, {
                              enabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                        />
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            rule.type === 'cors_bypass'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {rule.type === 'cors_bypass' ? 'CORS BYPASS' : 'URL REDIRECT'}
                        </span>
                        <input
                          type="text"
                          value={rule.name}
                          onChange={(e) =>
                            updateRedirectCorsRule(rule.id, { name: e.target.value })
                          }
                          className="flex-1 px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-white"
                        />
                      </div>
                      <button
                        onClick={() => deleteRedirectCorsRule(rule.id)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pl-6">
                      <div className={rule.type === 'cors_bypass' ? 'col-span-2' : ''}>
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          Kaynak URL Filtresi
                        </label>
                        <input
                          type="text"
                          value={rule.sourceUrlFilter}
                          onChange={(e) =>
                            updateRedirectCorsRule(rule.id, {
                              sourceUrlFilter: e.target.value,
                            })
                          }
                          placeholder="* veya ^https://api\.sirket\.com/(.*)"
                          className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-white font-mono"
                        />
                      </div>

                      {rule.type === 'redirect' && (
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">
                            Hedef URL (Örn: http://localhost:8080/\1)
                          </label>
                          <input
                            type="text"
                            value={rule.destinationUrl || ''}
                            onChange={(e) =>
                              updateRedirectCorsRule(rule.id, {
                                destinationUrl: e.target.value,
                              })
                            }
                            placeholder="http://localhost:8080/\1"
                            className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-md text-emerald-300 font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: LIVE INTERCEPT LOGS                                          */}
        {/* =================================================================== */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-xs font-semibold text-white">
                  Yakalanan & Manipüle Edilen İstek Kayıtları
                </h3>
                <p className="text-[11px] text-slate-400">
                  Sayfalarda Body kurallarına takılan Fetch/XHR istekleri burada listelenir.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshLogs}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  Yenile
                </button>
                <button
                  onClick={clearLogs}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-xs text-rose-300"
                >
                  Temizle
                </button>
              </div>
            </div>

            {state.logs.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                Henüz yakalanan bir Body manipülasyon kaydı yok. Kuralları etkinleştirip sayfada işlem yaptığında burada görünecektir.
              </div>
            ) : (
              <div className="space-y-1.5">
                {state.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 shrink-0">
                        {log.method}
                      </span>
                      <span className="font-mono text-slate-200 truncate text-[11px]">
                        {log.url}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-emerald-400">
                        {log.details}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {statusToast && (
        <div className="fixed bottom-10 right-4 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium shadow-lg">
          {statusToast}
        </div>
      )}

      {/* Footer */}
      <footer className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          Aktif Profil: <strong className="text-slate-200">{activeProfile.name}</strong>
        </span>
        <span>
          100% Yerel & Güvenli • Telepresence + Header + Body Manipulator
        </span>
      </footer>
    </div>
  );
}
