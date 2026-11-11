import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRightLeft,
  Check,
  Copy,
  CopyPlus,
  Crosshair,
  Download,
  FileCode2,
  FolderGit2,
  Globe,
  Layers,
  Plus,
  RotateCw,
  Search,
  SlidersHorizontal,
  Terminal,
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

type TabType = 'headers' | 'body' | 'routing' | 'logs';

const HEADER_TEMPLATES = [
  { label: 'Bearer Auth', name: 'Authorization', value: 'Bearer ', target: 'request' as const, op: 'set' as const },
  { label: 'API Key', name: 'X-API-Key', value: '', target: 'request' as const, op: 'set' as const },
  { label: 'No Cache', name: 'Cache-Control', value: 'no-cache, no-store', target: 'request' as const, op: 'set' as const },
  { label: 'Spoof IP', name: 'X-Forwarded-For', value: '127.0.0.1', target: 'request' as const, op: 'set' as const },
  { label: 'Tenant ID', name: 'X-Tenant-ID', value: 'staging-tenant', target: 'request' as const, op: 'set' as const },
  { label: 'Strip CSP', name: 'Content-Security-Policy', value: '', target: 'response' as const, op: 'remove' as const },
];

function Switch({
  checked,
  onChange,
  size = 'sm',
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  size?: 'sm' | 'md';
}) {
  const dims = size === 'md' ? 'w-8 h-4' : 'w-7 h-3.5';
  const dot = size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5';
  const translate = size === 'md' ? 'translate-x-4' : 'translate-x-3.5';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex items-center rounded-full transition-colors duration-150 focus:outline-none shrink-0 ${dims} ${
        checked ? 'bg-blue-600' : 'bg-zinc-700/80 hover:bg-zinc-600'
      }`}
    >
      <span
        className={`inline-block rounded-full bg-white transform transition-transform duration-150 ${dot} ${
          checked ? translate : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function App() {
  const [state, setState] = useState<ExtensionState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<TabType>('headers');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [addingProfile, setAddingProfile] = useState(false);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeDomainPattern, setActiveDomainPattern] = useState<string>('*');
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [curlInput, setCurlInput] = useState('');

  useEffect(() => {
    loadExtensionState().then((loaded) => {
      setState(loaded);
      const prof =
        loaded.profiles.find((p) => p.id === loaded.activeProfileId) ||
        loaded.profiles[0];
      if (prof?.bodyRules?.[0]) {
        setSelectedBodyId(prof.bodyRules[0].id);
      }
    });

    if (extApi?.tabs) {
      extApi.tabs
        .query({ active: true, currentWindow: true })
        .then(([tab]) => {
          if (tab?.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
            try {
              const u = new URL(tab.url);
              setActiveDomainPattern(`*://${u.hostname}/*`);
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
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

  // Scope all enabled header rules in profile to current tab domain
  const scopeHeadersToCurrentDomain = () => {
    if (activeDomainPattern === '*') {
      showToast('Open an HTTP/HTTPS tab first');
      return;
    }
    updateActiveProfile((prof) => ({
      ...prof,
      headerRules: prof.headerRules.map((r) => ({
        ...r,
        urlFilter: activeDomainPattern,
      })),
    }));
    showToast(`Scoped rules to ${activeDomainPattern}`);
  };

  // Parse cURL command into Header & Body rules
  const handleImportCurl = () => {
    const raw = curlInput.trim();
    if (!raw) return;

    const urlMatch = raw.match(/curl\s+(?:-[A-Za-z]+\s+\S+\s+)*['"]?(https?:\/\/[^\s'"]+)['"]?/i) ||
      raw.match(/['"](https?:\/\/[^\s'"]+)['"]/i);
    let urlFilter = '*';
    let pathname = '/api/';
    if (urlMatch?.[1]) {
      try {
        const parsedUrl = new URL(urlMatch[1]);
        urlFilter = `*://${parsedUrl.hostname}/*`;
        pathname = parsedUrl.pathname || '/';
      } catch {
        // fallback
      }
    }

    const headerRegex = /(?:-H|--header)\s+['"]([^:'"]+):\s*([^'"]*)['"]/gi;
    const importedHeaders: HeaderRule[] = [];
    let match: RegExpExecArray | null;
    while ((match = headerRegex.exec(raw)) !== null) {
      const hName = match[1].trim();
      const hVal = match[2].trim();
      // Skip noisy browser-internal headers unless user wants them
      if (['sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'accept-language'].includes(hName.toLowerCase())) {
        continue;
      }
      importedHeaders.push({
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        enabled: true,
        name: hName,
        value: hVal,
        operation: 'set',
        target: 'request',
        urlFilter,
      });
    }

    const dataMatch = raw.match(/(?:-d|--data|--data-raw|--data-binary)\s+['"]([\s\S]*?)['"](?:\s+-|\s*$)/i);
    let importedBody: BodyRule | null = null;
    if (dataMatch?.[1]) {
      const methodMatch = raw.match(/(?:-X|--request)\s+['"]?([A-Z]+)['"]?/i);
      const detectedMethod = (methodMatch?.[1]?.toUpperCase() || 'POST') as BodyRule['method'];
      importedBody = {
        id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        enabled: true,
        name: `cURL ${pathname}`,
        urlPattern: pathname,
        method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(detectedMethod)
          ? detectedMethod
          : 'POST',
        mode: 'replace_request',
        statusCode: 200,
        delayMs: 0,
        bodyContent: dataMatch[1],
      };
    }

    updateActiveProfile((prof) => ({
      ...prof,
      headerRules: [...importedHeaders, ...prof.headerRules],
      bodyRules: importedBody ? [importedBody, ...prof.bodyRules] : prof.bodyRules,
    }));

    setCurlInput('');
    setShowCurlModal(false);
    showToast(
      `Imported ${importedHeaders.length} headers${importedBody ? ' + 1 body rule' : ''}`
    );
  };

  // Header Rules
  const addHeaderRule = (
    name = '',
    value = '',
    target: HeaderTarget = 'request',
    operation: HeaderOperation = 'set'
  ) => {
    const newRule: HeaderRule = {
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      enabled: true,
      name,
      value,
      operation,
      target,
      urlFilter: '*',
    };
    updateActiveProfile((prof) => ({
      ...prof,
      headerRules: [newRule, ...prof.headerRules],
    }));
  };

  const duplicateHeaderRule = (rule: HeaderRule) => {
    const copy: HeaderRule = {
      ...rule,
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    updateActiveProfile((prof) => ({
      ...prof,
      headerRules: [copy, ...prof.headerRules],
    }));
    showToast('Rule duplicated');
  };

  const toggleAllHeaders = (enable: boolean) => {
    updateActiveProfile((prof) => ({
      ...prof,
      headerRules: prof.headerRules.map((r) => ({ ...r, enabled: enable })),
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

  // Body Rules
  const addBodyRule = () => {
    const newRule: BodyRule = {
      id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      enabled: true,
      name: 'New Endpoint Override',
      urlPattern: '/api/',
      isRegex: false,
      method: 'ALL',
      mode: 'merge_response_json',
      statusCode: 200,
      delayMs: 0,
      contentType: 'application/json',
      bodyContent: '{\n  "status": "ok"\n}',
    };
    updateActiveProfile((prof) => ({
      ...prof,
      bodyRules: [newRule, ...prof.bodyRules],
    }));
    setSelectedBodyId(newRule.id);
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

  // Redirect, CORS & Query Param Rules
  const addRedirectCorsRule = (type: 'redirect' | 'cors_bypass' | 'query_param') => {
    const newRule: RedirectCorsRule = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      enabled: true,
      name:
        type === 'cors_bypass'
          ? 'Global CORS Bypass'
          : type === 'query_param'
          ? 'Query Parameter'
          : 'Route to Localhost',
      type,
      sourceUrlFilter:
        type === 'redirect' ? '^https://api\\.example\\.com/(.*)' : activeDomainPattern,
      destinationUrl: type === 'redirect' ? 'http://localhost:8080/\\1' : '',
      queryKey: type === 'query_param' ? 'debug' : '',
      queryValue: type === 'query_param' ? '1' : '',
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

  // Context / Cluster Routing
  const updateContextRouting = (patch: Partial<TelepresenceConfig>) => {
    updateActiveProfile((prof) => ({
      ...prof,
      telepresence: { ...prof.telepresence, ...patch },
    }));
  };

  const handleInterceptPaste = (raw: string) => {
    const match =
      raw.match(/x-telepresence-intercept-id\s*[:=]\s*([^\s,"']+)/i) ||
      raw.match(/telepresence-intercept-id\s*[:=]\s*([^\s,"']+)/i) ||
      raw.match(/Intercept ID\s*[:=]\s*([^\s,"']+)/i);
    const id = match ? match[1].trim() : raw.trim();
    updateContextRouting({
      enabled: true,
      interceptId: id,
      baggageHeader: id ? `telepresence-intercept-id=${id}` : '',
    });
  };

  // Profile Management
  const createProfile = () => {
    if (!newProfileName.trim()) return;
    const nextProf: Profile = {
      id: `p-${Date.now()}`,
      name: newProfileName.trim(),
      color: '#3b82f6',
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
      activeProfileId: nextProf.id,
      profiles: [...prev.profiles, nextProf],
    }));
    setNewProfileName('');
    setAddingProfile(false);
    showToast(`Workspace "${nextProf.name}" created`);
  };

  const deleteCurrentProfile = () => {
    if (state.profiles.length <= 1) return;
    const remaining = state.profiles.filter((p) => p.id !== activeProfile.id);
    updateState((prev) => ({
      ...prev,
      activeProfileId: remaining[0].id,
      profiles: remaining,
    }));
    showToast('Workspace removed');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reqforge-${activeProfile.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported configuration');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (parsed && Array.isArray(parsed.profiles)) {
          updateState(() => parsed);
          showToast('Configuration imported');
        }
      } catch {
        showToast('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const reloadTab = async () => {
    if (extApi?.tabs) {
      const [tab] = await extApi.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        extApi.tabs.reload(tab.id);
        showToast('Reloaded active tab');
      }
    }
  };

  // Counts
  const activeHeaders = activeProfile.headerRules.filter(
    (r) => r.enabled && r.name.trim()
  ).length;
  const activeBodies = activeProfile.bodyRules.filter(
    (r) => r.enabled && r.urlPattern.trim()
  ).length;
  const contextActive =
    activeProfile.telepresence.enabled &&
    Boolean(
      activeProfile.telepresence.interceptId.trim() ||
        activeProfile.telepresence.baggageHeader.trim() ||
        (activeProfile.telepresence.customHeaderName.trim() &&
          activeProfile.telepresence.customHeaderValue.trim()) ||
        activeProfile.telepresence.envoyForceTrace
    );
  const activeRouting =
    activeProfile.redirectCorsRules.filter((r) => r.enabled).length +
    (contextActive ? 1 : 0);

  const filteredHeaders = activeProfile.headerRules.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.value.toLowerCase().includes(q) ||
      r.urlFilter.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-[560px] bg-[#0d0f12] text-zinc-200 select-none">
      {/* Top Application Header */}
      <header className="flex items-center justify-between h-12 px-3.5 bg-[#12151a] border-b border-zinc-800/80">
        {/* Left: Our Official Logo, Brand & Workspace */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/icons/icon-48.png"
              alt="ReqForge Logo"
              className={`w-6 h-6 rounded transition-opacity ${
                state.globalEnabled ? 'opacity-100' : 'opacity-40 grayscale'
              }`}
            />
            <div className="leading-tight">
              <div className="font-semibold text-[13px] tracking-tight text-zinc-100">
                ReqForge
              </div>
              <div className="text-[9px] text-zinc-500 font-medium">by Xristal</div>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          {addingProfile ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createProfile()}
                placeholder="Workspace name..."
                autoFocus
                className="h-6 px-2 text-[11px] rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-blue-500 w-32"
              />
              <button
                onClick={createProfile}
                className="h-6 px-2 text-[11px] rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                Add
              </button>
              <button
                onClick={() => setAddingProfile(false)}
                className="h-6 px-1.5 text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 h-7 px-2 rounded-md bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-colors">
                <Layers className="w-3 h-3 text-zinc-400" />
                <select
                  value={activeProfile.id}
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      activeProfileId: e.target.value,
                    }))
                  }
                  className="bg-transparent text-[11px] font-medium text-zinc-200 focus:outline-none cursor-pointer pr-1"
                >
                  {state.profiles.map((p) => (
                    <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-100">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setAddingProfile(true)}
                title="New Workspace"
                className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {state.profiles.length > 1 && (
                <button
                  onClick={deleteCurrentProfile}
                  title="Delete Workspace"
                  className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: cURL Import, Reload, Export/Import & Master Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCurlModal(true)}
            title="Import headers & body from a cURL command"
            className="h-7 px-2.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            <Terminal className="w-3 h-3 text-blue-400" />
            <span>Import cURL</span>
          </button>

          <button
            onClick={reloadTab}
            title="Reload Active Tab"
            className="h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            <RotateCw className="w-3 h-3" />
          </button>

          <div className="flex items-center rounded-md bg-zinc-900 border border-zinc-800 p-0.5">
            <button
              onClick={handleExport}
              title="Export JSON"
              className="h-6 w-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <label
              title="Import JSON"
              className="h-6 w-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

          {/* Prominent Active / Passive Master Switch */}
          <div
            onClick={() =>
              updateState((prev) => ({
                ...prev,
                globalEnabled: !prev.globalEnabled,
              }))
            }
            title="Enable or pause all extension interceptions"
            className={`flex items-center gap-2 h-7 px-2.5 rounded-md border cursor-pointer transition-all ${
              state.globalEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <Switch
              size="sm"
              checked={state.globalEnabled}
              onChange={(val) =>
                updateState((prev) => ({ ...prev, globalEnabled: val }))
              }
            />
            <span className="text-[11px] font-semibold tracking-wide min-w-[42px] text-center">
              {state.globalEnabled ? 'AKTİF' : 'PASİF'}
            </span>
          </div>
        </div>
      </header>

      {/* Global Paused Banner */}
      {!state.globalEnabled && (
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-rose-500/10 border-b border-rose-500/25 text-[11px] text-rose-300">
          <span>
            Extension is currently <strong>PAUSED</strong> — no HTTP headers, redirects, or body rules are being applied.
          </span>
          <button
            onClick={() =>
              updateState((prev) => ({ ...prev, globalEnabled: true }))
            }
            className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-medium text-[10px]"
          >
            Enable Now
          </button>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="flex items-center justify-between h-9 px-3.5 bg-[#101217] border-b border-zinc-800/80">
        <div className="flex items-center gap-1 h-full">
          {(
            [
              {
                id: 'headers',
                label: 'HTTP Headers',
                icon: SlidersHorizontal,
                count: activeHeaders,
              },
              {
                id: 'body',
                label: 'Body & Mocking',
                icon: FileCode2,
                count: activeBodies,
              },
              {
                id: 'routing',
                label: 'CORS, Query & Routing',
                icon: ArrowRightLeft,
                count: activeRouting,
              },
              {
                id: 'logs',
                label: 'Inspector',
                icon: Activity,
                count: state.logs.length,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'logs') {
                    loadExtensionState().then(setState);
                  }
                }}
                className={`h-full px-3 flex items-center gap-1.5 border-b-2 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'border-blue-500 text-zinc-100 bg-zinc-900/40'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono-code ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'headers' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={scopeHeadersToCurrentDomain}
              title={`Scope rules to active tab (${activeDomainPattern})`}
              className="h-6 px-2 rounded flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300"
            >
              <Crosshair className="w-3 h-3 text-emerald-400" />
              <span>Pin Domain</span>
            </button>
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter..."
                className="h-6 pl-6 pr-2 w-32 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* =================================================================== */}
        {/* TAB 1: HTTP HEADERS                                                 */}
        {/* =================================================================== */}
        {activeTab === 'headers' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#12151a]/60 border-b border-zinc-800/70">
              <div className="flex items-center gap-1 flex-wrap">
                {HEADER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() =>
                      addHeaderRule(tpl.name, tpl.value, tpl.target, tpl.op)
                    }
                    className="h-6 px-2 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 text-[11px] transition-colors"
                  >
                    + {tpl.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {activeProfile.headerRules.length > 1 && (
                  <button
                    onClick={() => toggleAllHeaders(activeHeaders === 0)}
                    className="h-6 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200"
                  >
                    {activeHeaders === 0 ? 'Enable All' : 'Disable All'}
                  </button>
                )}
                <button
                  onClick={() => addHeaderRule()}
                  className="h-6 px-2.5 rounded flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 px-3.5 py-1.5 bg-[#101217] border-b border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <div className="col-span-3">Target & Action</div>
              <div className="col-span-3">Header Name</div>
              <div className="col-span-4">Header Value</div>
              <div className="col-span-2">URL Pattern</div>
            </div>

            <div className="divide-y divide-zinc-800/50">
              {filteredHeaders.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs">
                  No HTTP header rules match. Click &ldquo;Add Rule&rdquo;, &ldquo;Import cURL&rdquo;, or pick a template.
                </div>
              ) : (
                filteredHeaders.map((rule) => (
                  <div
                    key={rule.id}
                    className={`grid grid-cols-12 gap-2 px-3.5 py-2 items-center transition-colors hover:bg-zinc-900/30 ${
                      !rule.enabled ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="col-span-3 flex items-center gap-1.5">
                      <Switch
                        checked={rule.enabled}
                        onChange={(val) => updateHeaderRule(rule.id, { enabled: val })}
                      />
                      <select
                        value={rule.target}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, {
                            target: e.target.value as HeaderTarget,
                          })
                        }
                        className={`h-6 px-1.5 rounded text-[11px] font-medium border focus:outline-none ${
                          rule.target === 'request'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        }`}
                      >
                        <option value="request" className="bg-zinc-900 text-zinc-200">
                          REQ
                        </option>
                        <option value="response" className="bg-zinc-900 text-zinc-200">
                          RES
                        </option>
                      </select>

                      <select
                        value={rule.operation}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, {
                            operation: e.target.value as HeaderOperation,
                          })
                        }
                        className="h-6 px-1.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none focus:border-zinc-600"
                      >
                        <option value="set">Set</option>
                        <option value="append">Append</option>
                        <option value="remove">Remove</option>
                      </select>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, { name: e.target.value })
                        }
                        placeholder="Header-Name"
                        className="w-full h-6 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-4">
                      <input
                        type="text"
                        disabled={rule.operation === 'remove'}
                        value={rule.operation === 'remove' ? '' : rule.value}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, { value: e.target.value })
                        }
                        placeholder={
                          rule.operation === 'remove'
                            ? 'Header will be stripped'
                            : 'Value...'
                        }
                        className="w-full h-6 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-emerald-300 placeholder-zinc-600 disabled:opacity-40 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-2 flex items-center gap-0.5">
                      <input
                        type="text"
                        value={rule.urlFilter}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, { urlFilter: e.target.value })
                        }
                        placeholder="*"
                        className="w-full h-6 px-1.5 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-zinc-400 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => duplicateHeaderRule(rule)}
                        title="Duplicate rule"
                        className="h-6 w-5 rounded shrink-0 flex items-center justify-center text-zinc-500 hover:text-zinc-200"
                      >
                        <CopyPlus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteHeaderRule(rule.id)}
                        title="Delete rule"
                        className="h-6 w-5 rounded shrink-0 flex items-center justify-center text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: BODY OVERRIDE & API MOCKING                                  */}
        {/* =================================================================== */}
        {activeTab === 'body' && (
          <div className="grid grid-cols-12 h-[454px]">
            <div className="col-span-4 border-r border-zinc-800/80 flex flex-col bg-[#101217]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80">
                <span className="text-[11px] font-medium text-zinc-400">
                  Body Rules ({activeProfile.bodyRules.length})
                </span>
                <button
                  onClick={addBodyRule}
                  className="h-6 px-2 rounded flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50">
                {activeProfile.bodyRules.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    No body rules yet.
                  </div>
                ) : (
                  activeProfile.bodyRules.map((rule) => {
                    const isSelected = selectedBodyId === rule.id;
                    return (
                      <div
                        key={rule.id}
                        onClick={() => setSelectedBodyId(rule.id)}
                        className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-600/10 border-l-2 border-l-blue-500 text-zinc-100'
                            : 'text-zinc-400 hover:bg-zinc-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Switch
                            checked={rule.enabled}
                            onChange={(val) =>
                              updateBodyRule(rule.id, { enabled: val })
                            }
                          />
                          <div className="truncate">
                            <div className="text-[11px] font-medium text-zinc-200 truncate">
                              {rule.name || rule.urlPattern}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono-code px-1 rounded bg-zinc-800 text-blue-300">
                                {rule.method}
                              </span>
                              <span className="text-[10px] font-mono-code text-zinc-500 truncate">
                                {rule.urlPattern}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBodyRule(rule.id);
                          }}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="col-span-8 p-3.5 flex flex-col h-full bg-[#0d0f12]">
              {(() => {
                const selected =
                  activeProfile.bodyRules.find((r) => r.id === selectedBodyId) ||
                  activeProfile.bodyRules[0];
                if (!selected) {
                  return (
                    <div className="m-auto text-zinc-500 text-xs">
                      Create or select a rule on the left to configure body manipulation.
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col h-full gap-3">
                    <div className="grid grid-cols-12 gap-2.5">
                      <div className="col-span-5">
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                          Rule Name
                        </label>
                        <input
                          type="text"
                          value={selected.name}
                          onChange={(e) =>
                            updateBodyRule(selected.id, { name: e.target.value })
                          }
                          placeholder="e.g. Override Feature Flags"
                          className="w-full h-7 px-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="col-span-7">
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                          Mutation Strategy
                        </label>
                        <select
                          value={selected.mode}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              mode: e.target.value as BodyRuleMode,
                            })
                          }
                          className="w-full h-7 px-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-blue-300 font-medium focus:outline-none focus:border-blue-500"
                        >
                          <option value="merge_response_json">
                            Response: Shallow Merge JSON Keys
                          </option>
                          <option value="replace_response">
                            Response: Full Body Replace (Mock Endpoint)
                          </option>
                          <option value="merge_request_json">
                            Request: Shallow Merge Outgoing JSON
                          </option>
                          <option value="replace_request">
                            Request: Replace Outgoing Body
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2.5">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                          Method
                        </label>
                        <select
                          value={selected.method}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              method: e.target.value as BodyRule['method'],
                            })
                          }
                          className="w-full h-7 px-1.5 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-zinc-200"
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
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                          URL Pattern (Substring or Wildcard *)
                        </label>
                        <input
                          type="text"
                          value={selected.urlPattern}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              urlPattern: e.target.value,
                            })
                          }
                          placeholder="/api/v1/features"
                          className="w-full h-7 px-2.5 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-zinc-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                          HTTP Status
                        </label>
                        <input
                          type="number"
                          value={selected.statusCode || 200}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              statusCode: Number(e.target.value) || 200,
                            })
                          }
                          className="w-full h-7 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-emerald-300"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                          Delay (ms)
                        </label>
                        <input
                          type="number"
                          value={selected.delayMs || 0}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              delayMs: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full h-7 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-amber-300"
                        />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-zinc-400">
                          JSON / Text Payload
                        </span>
                        <button
                          onClick={() => {
                            try {
                              updateBodyRule(selected.id, {
                                bodyContent: JSON.stringify(
                                  JSON.parse(selected.bodyContent),
                                  null,
                                  2
                                ),
                              });
                              showToast('Formatted JSON');
                            } catch {
                              showToast('Invalid JSON syntax');
                            }
                          }}
                          className="text-[11px] text-blue-400 hover:text-blue-300"
                        >
                          Format JSON
                        </button>
                      </div>
                      <textarea
                        value={selected.bodyContent}
                        onChange={(e) =>
                          updateBodyRule(selected.id, {
                            bodyContent: e.target.value,
                          })
                        }
                        spellCheck={false}
                        className="flex-1 w-full p-3 rounded-md bg-[#08090b] border border-zinc-800 font-mono-code text-[11px] text-emerald-300 resize-none focus:outline-none focus:border-blue-500 leading-relaxed"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CORS, QUERY PARAMS, REDIRECT & CONTEXT                       */}
        {/* =================================================================== */}
        {activeTab === 'routing' && (
          <div className="p-3.5 space-y-4">
            <div className="rounded-lg bg-[#12151a] border border-zinc-800/80 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-zinc-100">
                    CORS, Query Params & URL Redirects
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => addRedirectCorsRule('cors_bypass')}
                    className="h-6 px-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium"
                  >
                    + CORS Bypass
                  </button>
                  <button
                    onClick={() => addRedirectCorsRule('query_param')}
                    className="h-6 px-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium"
                  >
                    + Query Param
                  </button>
                  <button
                    onClick={() => addRedirectCorsRule('redirect')}
                    className="h-6 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium"
                  >
                    + URL Redirect
                  </button>
                </div>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {activeProfile.redirectCorsRules.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    No active CORS, Query Param, or Redirect rules.
                  </div>
                ) : (
                  activeProfile.redirectCorsRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`grid grid-cols-12 gap-2 px-3.5 py-2.5 items-center ${
                        !rule.enabled ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="col-span-2 flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onChange={(val) =>
                            updateRedirectCorsRule(rule.id, { enabled: val })
                          }
                        />
                        <span
                          className={`font-mono-code text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            rule.type === 'cors_bypass'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : rule.type === 'query_param'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {rule.type === 'cors_bypass'
                            ? 'CORS'
                            : rule.type === 'query_param'
                            ? 'QUERY'
                            : '307'}
                        </span>
                      </div>

                      <div
                        className={
                          rule.type === 'cors_bypass' ? 'col-span-9' : 'col-span-4'
                        }
                      >
                        <input
                          type="text"
                          value={rule.sourceUrlFilter}
                          onChange={(e) =>
                            updateRedirectCorsRule(rule.id, {
                              sourceUrlFilter: e.target.value,
                            })
                          }
                          placeholder="Source URL filter (* or ^https://api\.prod\.com/(.*))"
                          className="w-full h-6 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-zinc-100"
                        />
                      </div>

                      {rule.type === 'redirect' && (
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={rule.destinationUrl || ''}
                            onChange={(e) =>
                              updateRedirectCorsRule(rule.id, {
                                destinationUrl: e.target.value,
                              })
                            }
                            placeholder="http://localhost:8080/\1"
                            className="w-full h-6 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-emerald-300"
                          />
                        </div>
                      )}

                      {rule.type === 'query_param' && (
                        <div className="col-span-5 grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={rule.queryKey || ''}
                            onChange={(e) =>
                              updateRedirectCorsRule(rule.id, {
                                queryKey: e.target.value,
                              })
                            }
                            placeholder="param_key"
                            className="w-full h-6 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-amber-300"
                          />
                          <input
                            type="text"
                            value={rule.queryValue || ''}
                            onChange={(e) =>
                              updateRedirectCorsRule(rule.id, {
                                queryValue: e.target.value,
                              })
                            }
                            placeholder="value"
                            className="w-full h-6 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-emerald-300"
                          />
                        </div>
                      )}

                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => deleteRedirectCorsRule(rule.id)}
                          className="text-zinc-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg bg-[#12151a] border border-zinc-800/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-100">
                      Cluster & Mesh Context Propagation (Optional)
                    </span>
                    <p className="text-[11px] text-zinc-500">
                      Inject W3C OpenTelemetry baggage, Envoy trace flags, or Kubernetes Telepresence intercept headers.
                    </p>
                  </div>
                </div>
                <Switch
                  size="md"
                  checked={activeProfile.telepresence.enabled}
                  onChange={(val) => updateContextRouting({ enabled: val })}
                />
              </div>

              {activeProfile.telepresence.enabled && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                      Intercept ID (x-telepresence-intercept-id)
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={activeProfile.telepresence.interceptId}
                        onChange={(e) => handleInterceptPaste(e.target.value)}
                        placeholder="Paste ID or CLI output..."
                        className="flex-1 h-7 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-zinc-100 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            activeProfile.telepresence.interceptId
                          );
                          setCopiedId(true);
                          setTimeout(() => setCopiedId(false), 1200);
                        }}
                        className="h-7 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400"
                        title="Copy ID"
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
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                      W3C OpenTelemetry Baggage
                    </label>
                    <input
                      type="text"
                      value={activeProfile.telepresence.baggageHeader}
                      onChange={(e) =>
                        updateContextRouting({ baggageHeader: e.target.value })
                      }
                      placeholder="key1=val1,key2=val2"
                      className="w-full h-7 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-zinc-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                        Custom Context Header
                      </label>
                      <input
                        type="text"
                        value={activeProfile.telepresence.customHeaderName}
                        onChange={(e) =>
                          updateContextRouting({
                            customHeaderName: e.target.value,
                          })
                        }
                        placeholder="x-request-env"
                        className="w-full h-7 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                        Value
                      </label>
                      <input
                        type="text"
                        value={activeProfile.telepresence.customHeaderValue}
                        onChange={(e) =>
                          updateContextRouting({
                            customHeaderValue: e.target.value,
                          })
                        }
                        placeholder="local-dev"
                        className="w-full h-7 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-zinc-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                      Target Host Scope
                    </label>
                    <input
                      type="text"
                      value={activeProfile.telepresence.targetDomainFilter}
                      onChange={(e) =>
                        updateContextRouting({
                          targetDomainFilter: e.target.value,
                        })
                      }
                      placeholder="* or *://*.example.com/*"
                      className="w-full h-7 px-2 rounded bg-zinc-900 border border-zinc-800 font-mono-code text-[11px] text-zinc-200"
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeProfile.telepresence.propagateBaggage}
                        onChange={(e) =>
                          updateContextRouting({
                            propagateBaggage: e.target.checked,
                          })
                        }
                        className="accent-blue-500"
                      />
                      <span>Sync Intercept ID into W3C baggage</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeProfile.telepresence.envoyForceTrace}
                        onChange={(e) =>
                          updateContextRouting({
                            envoyForceTrace: e.target.checked,
                          })
                        }
                        className="accent-blue-500"
                      />
                      <span>Inject x-envoy-force-trace: true</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: INSPECTOR LOG                                                */}
        {/* =================================================================== */}
        {activeTab === 'logs' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#12151a] border-b border-zinc-800 text-[11px]">
              <span className="text-zinc-400">
                Captured Fetch / XHR Body Mutations ({state.logs.length})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => loadExtensionState().then(setState)}
                  className="h-6 px-2.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
                >
                  Refresh
                </button>
                <button
                  onClick={() => updateState((prev) => ({ ...prev, logs: [] }))}
                  className="h-6 px-2.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-red-400"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="divide-y divide-zinc-800/50 font-mono-code text-[11px]">
              {state.logs.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 font-sans text-xs">
                  No requests mutated yet. Trigger a matching request on any page to inspect it here.
                </div>
              ) : (
                state.logs.map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-12 gap-2 px-3.5 py-2 items-center hover:bg-zinc-900/40"
                  >
                    <div className="col-span-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/15 text-blue-300 font-semibold">
                        {log.method}
                      </span>
                    </div>
                    <div
                      className="col-span-6 truncate text-zinc-200"
                      title={log.url}
                    >
                      {log.url}
                    </div>
                    <div className="col-span-3 truncate text-emerald-400">
                      {log.details}
                    </div>
                    <div className="col-span-2 text-right text-zinc-500 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="h-6 px-3.5 bg-[#101217] border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
        <div className="flex items-center gap-2">
          <span>
            Tab Scope: <code className="text-zinc-300 font-mono-code">{activeDomainPattern}</code>
          </span>
        </div>
        <span>ReqForge by Xristal</span>
      </footer>

      {/* cURL Import Modal */}
      {showCurlModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg rounded-lg bg-[#12151a] border border-zinc-700 p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-100">
                Import Rules from cURL
              </span>
              <button
                onClick={() => setShowCurlModal(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Right-click any network request in DevTools → <strong>Copy as cURL</strong> and paste below. Headers (<code>-H</code>) and request payloads (<code>--data-raw</code>) will be extracted automatically.
            </p>
            <textarea
              rows={6}
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              placeholder={`curl 'https://api.example.com/v1/orders' \\\n  -H 'Authorization: Bearer eyJ...' \\\n  -H 'X-Tenant-ID: acme' \\\n  --data-raw '{"dryRun":true}'`}
              spellCheck={false}
              className="w-full p-2.5 rounded bg-[#08090b] border border-zinc-800 font-mono-code text-[11px] text-emerald-300 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCurlModal(false)}
                className="h-7 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCurl}
                className="h-7 px-3 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium"
              >
                Extract & Add Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Toast */}
      {toast && (
        <div className="fixed bottom-8 right-3.5 px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-[11px] font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
