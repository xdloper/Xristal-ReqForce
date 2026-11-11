import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Plus,
  RotateCw,
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

type TabType = 'headers' | 'telepresence' | 'body' | 'network' | 'logs';

export default function App() {
  const [state, setState] = useState<ExtensionState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<TabType>('headers');
  const [copiedId, setCopiedId] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [addingProfile, setAddingProfile] = useState(false);
  const [expandedBodyId, setExpandedBodyId] = useState<string | null>(null);

  useEffect(() => {
    loadExtensionState().then((loaded) => {
      setState(loaded);
      const prof =
        loaded.profiles.find((p) => p.id === loaded.activeProfileId) ||
        loaded.profiles[0];
      if (prof?.bodyRules?.[0]) {
        setExpandedBodyId(prof.bodyRules[0].id);
      }
    });
  }, []);

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

  // Telepresence handlers
  const updateTelepresence = (patch: Partial<TelepresenceConfig>) => {
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
    updateTelepresence({
      enabled: true,
      interceptId: id,
      baggageHeader: id ? `telepresence-intercept-id=${id}` : '',
    });
  };

  // Header handlers
  const addHeaderRule = (name = '', value = '') => {
    const newRule: HeaderRule = {
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      enabled: true,
      name,
      value,
      operation: 'set',
      target: 'request',
      urlFilter: '*',
    };
    updateActiveProfile((prof) => ({
      ...prof,
      headerRules: [...prof.headerRules, newRule],
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

  // Body handlers
  const addBodyRule = () => {
    const newRule: BodyRule = {
      id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      enabled: true,
      name: '/api/v1/resource',
      urlPattern: '/api/',
      isRegex: false,
      method: 'ALL',
      mode: 'merge_response_json',
      statusCode: 200,
      delayMs: 0,
      contentType: 'application/json',
      bodyContent: '{\n  \n}',
    };
    updateActiveProfile((prof) => ({
      ...prof,
      bodyRules: [...prof.bodyRules, newRule],
    }));
    setExpandedBodyId(newRule.id);
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

  // Network (CORS / Redirect) handlers
  const addRedirectCorsRule = (type: 'redirect' | 'cors_bypass') => {
    const newRule: RedirectCorsRule = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      enabled: true,
      name: type === 'cors_bypass' ? 'CORS Override' : 'Redirect Rule',
      type,
      sourceUrlFilter: type === 'cors_bypass' ? '*' : '^https://api\\.example\\.com/(.*)',
      destinationUrl: type === 'redirect' ? 'http://localhost:8080/\\1' : '',
    };
    updateActiveProfile((prof) => ({
      ...prof,
      redirectCorsRules: [...prof.redirectCorsRules, newRule],
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

  // Profile creation
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
  };

  const deleteCurrentProfile = () => {
    if (state.profiles.length <= 1) return;
    const remaining = state.profiles.filter((p) => p.id !== activeProfile.id);
    updateState((prev) => ({
      ...prev,
      activeProfileId: remaining[0].id,
      profiles: remaining,
    }));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interceptor-${activeProfile.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
        }
      } catch {
        // Invalid file
      }
    };
    reader.readAsText(file);
  };

  const reloadTab = async () => {
    if (extApi?.tabs) {
      const [tab] = await extApi.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) extApi.tabs.reload(tab.id);
    }
  };

  const activeHeaders = activeProfile.headerRules.filter(
    (r) => r.enabled && r.name.trim()
  ).length;
  const activeBodies = activeProfile.bodyRules.filter(
    (r) => r.enabled && r.urlPattern.trim()
  ).length;
  const activeNet = activeProfile.redirectCorsRules.filter((r) => r.enabled).length;
  const tpEnabled =
    activeProfile.telepresence.enabled &&
    Boolean(
      activeProfile.telepresence.interceptId.trim() ||
        activeProfile.telepresence.baggageHeader.trim() ||
        activeProfile.telepresence.envoyForceTrace
    );

  return (
    <div className="flex flex-col h-[540px] bg-[#111113] text-zinc-200 select-none">
      {/* Top Bar — Dense DevTools Toolbar */}
      <header className="flex items-center justify-between h-9 px-3 bg-[#18181b] border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {/* Master Switch */}
          <button
            onClick={() =>
              updateState((prev) => ({ ...prev, globalEnabled: !prev.globalEnabled }))
            }
            className="flex items-center gap-1.5 text-xs font-medium focus:outline-none"
            title="Toggle all interceptions"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                state.globalEnabled ? 'bg-emerald-500' : 'bg-zinc-600'
              }`}
            />
            <span className={state.globalEnabled ? 'text-zinc-100' : 'text-zinc-500'}>
              {state.globalEnabled ? 'Intercepting' : 'Paused'}
            </span>
          </button>

          <span className="text-zinc-700">|</span>

          {/* Profile Switcher */}
          {addingProfile ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createProfile()}
                placeholder="profile-name"
                autoFocus
                className="h-6 px-2 text-[11px] bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-blue-500 w-28"
              />
              <button
                onClick={createProfile}
                className="h-6 px-2 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
              >
                Save
              </button>
              <button
                onClick={() => setAddingProfile(false)}
                className="h-6 px-1.5 text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Esc
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-zinc-500">Profile:</span>
              <select
                value={activeProfile.id}
                onChange={(e) =>
                  updateState((prev) => ({ ...prev, activeProfileId: e.target.value }))
                }
                className="h-6 px-1.5 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-zinc-600"
              >
                {state.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setAddingProfile(true)}
                title="New Profile"
                className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {state.profiles.length > 1 && (
                <button
                  onClick={deleteCurrentProfile}
                  title="Delete Current Profile"
                  className="h-6 w-6 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={reloadTab}
            title="Reload Active Tab"
            className="h-6 px-2 flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent hover:border-zinc-700"
          >
            <RotateCw className="w-3 h-3" />
            <span>Reload</span>
          </button>
          <button
            onClick={handleExport}
            title="Export JSON"
            className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <label
            title="Import JSON"
            className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </header>

      {/* Secondary Tab Bar */}
      <nav className="flex items-center h-8 px-2 bg-[#141417] border-b border-zinc-800 text-[11px]">
        {(
          [
            { id: 'headers', label: 'Headers', count: activeHeaders },
            { id: 'telepresence', label: 'Telepresence', count: tpEnabled ? 1 : 0 },
            { id: 'body', label: 'Body Override', count: activeBodies },
            { id: 'network', label: 'CORS / Redirect', count: activeNet },
            { id: 'logs', label: 'Traffic Log', count: state.logs.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'logs') {
                loadExtensionState().then(setState);
              }
            }}
            className={`h-full px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-zinc-100 bg-zinc-900/60 font-medium'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`px-1 text-[10px] font-mono ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto">
        {/* =================================================================== */}
        {/* TAB 1: HEADERS (Clean Table Layout)                                 */}
        {/* =================================================================== */}
        {activeTab === 'headers' && (
          <div className="flex flex-col h-full">
            {/* Table Action Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#16161a] border-b border-zinc-800 text-[11px]">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => addHeaderRule()}
                  className="h-6 px-2 flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  <Plus className="w-3 h-3" /> Add Header
                </button>
                <span className="text-zinc-700 mx-1">|</span>
                <span className="text-zinc-500">Quick insert:</span>
                <button
                  onClick={() =>
                    addHeaderRule('x-telepresence-intercept-id', 'intercept-id')
                  }
                  className="h-6 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-mono text-[10px]"
                >
                  x-telepresence-intercept-id
                </button>
                <button
                  onClick={() => addHeaderRule('Authorization', 'Bearer ')}
                  className="h-6 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-mono text-[10px]"
                >
                  Authorization
                </button>
                <button
                  onClick={() => addHeaderRule('Cache-Control', 'no-cache')}
                  className="h-6 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-mono text-[10px]"
                >
                  Cache-Control
                </button>
              </div>
              <span className="text-zinc-500 font-mono text-[10px]">
                {activeProfile.headerRules.length} rules
              </span>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-1 px-3 py-1 bg-[#141417] border-b border-zinc-800 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              <div className="col-span-2">Target / Action</div>
              <div className="col-span-4">Header Name</div>
              <div className="col-span-4">Value</div>
              <div className="col-span-2">URL Filter</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-zinc-800/70">
              {activeProfile.headerRules.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No header rules configured in this profile.
                </div>
              ) : (
                activeProfile.headerRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`grid grid-cols-12 gap-1 px-3 py-1.5 items-center hover:bg-zinc-900/40 ${
                      !rule.enabled ? 'opacity-45' : ''
                    }`}
                  >
                    <div className="col-span-2 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, { enabled: e.target.checked })
                        }
                        className="accent-blue-500 cursor-pointer"
                      />
                      <select
                        value={rule.target}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, {
                            target: e.target.value as HeaderTarget,
                          })
                        }
                        className="h-6 px-1 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none focus:border-blue-500"
                      >
                        <option value="request">REQ</option>
                        <option value="response">RES</option>
                      </select>
                      <select
                        value={rule.operation}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, {
                            operation: e.target.value as HeaderOperation,
                          })
                        }
                        className="h-6 px-1 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 focus:outline-none focus:border-blue-500"
                      >
                        <option value="set">SET</option>
                        <option value="append">ADD</option>
                        <option value="remove">DEL</option>
                      </select>
                    </div>

                    <div className="col-span-4">
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, { name: e.target.value })
                        }
                        placeholder="Header-Name"
                        className="w-full h-6 px-2 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-100 focus:outline-none focus:border-blue-500"
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
                          rule.operation === 'remove' ? '(removed)' : 'Header value'
                        }
                        className="w-full h-6 px-2 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200 disabled:opacity-40 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-2 flex items-center gap-1">
                      <input
                        type="text"
                        value={rule.urlFilter}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, { urlFilter: e.target.value })
                        }
                        placeholder="*"
                        className="w-full h-6 px-1.5 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => deleteHeaderRule(rule.id)}
                        className="h-6 w-6 shrink-0 flex items-center justify-center text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: TELEPRESENCE                                                 */}
        {/* =================================================================== */}
        {activeTab === 'telepresence' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <div className="text-xs font-medium text-zinc-100">
                  Telepresence Intercept Context
                </div>
                <div className="text-[11px] text-zinc-500">
                  Injects x-telepresence-intercept-id and W3C baggage headers at network level.
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={activeProfile.telepresence.enabled}
                  onChange={(e) => updateTelepresence({ enabled: e.target.checked })}
                  className="accent-blue-500"
                />
                <span className="text-zinc-200 font-medium">Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">
                  x-telepresence-intercept-id (or paste CLI output)
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={activeProfile.telepresence.interceptId}
                    onChange={(e) => handleInterceptPaste(e.target.value)}
                    placeholder="e.g. 9842a1b2-c3d4-4e5f-a1b2-c3d4e5f6a7b8:my-service"
                    className="flex-1 h-7 px-2.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        activeProfile.telepresence.interceptId
                      );
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 1200);
                    }}
                    className="h-7 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-[11px]"
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  W3C Baggage Header
                </label>
                <input
                  type="text"
                  value={activeProfile.telepresence.baggageHeader}
                  onChange={(e) => updateTelepresence({ baggageHeader: e.target.value })}
                  placeholder="telepresence-intercept-id=..."
                  className="w-full h-7 px-2.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  URL / Host Scope Filter
                </label>
                <input
                  type="text"
                  value={activeProfile.telepresence.targetDomainFilter}
                  onChange={(e) =>
                    updateTelepresence({ targetDomainFilter: e.target.value })
                  }
                  placeholder="* or *://*.internal.corp/*"
                  className="w-full h-7 px-2.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Extra Context Header Name
                </label>
                <input
                  type="text"
                  value={activeProfile.telepresence.customHeaderName}
                  onChange={(e) =>
                    updateTelepresence({ customHeaderName: e.target.value })
                  }
                  placeholder="x-dev-user"
                  className="w-full h-7 px-2.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Extra Context Header Value
                </label>
                <input
                  type="text"
                  value={activeProfile.telepresence.customHeaderValue}
                  onChange={(e) =>
                    updateTelepresence({ customHeaderValue: e.target.value })
                  }
                  placeholder="local"
                  className="w-full h-7 px-2.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeProfile.telepresence.propagateBaggage}
                  onChange={(e) =>
                    updateTelepresence({ propagateBaggage: e.target.checked })
                  }
                  className="accent-blue-500"
                />
                <span>Propagate OpenTelemetry baggage automatically</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeProfile.telepresence.envoyForceTrace}
                  onChange={(e) =>
                    updateTelepresence({ envoyForceTrace: e.target.checked })
                  }
                  className="accent-blue-500"
                />
                <span>Inject x-envoy-force-trace: true</span>
              </label>
            </div>

            {/* Raw HTTP Header Preview */}
            <div className="pt-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
                Active Outgoing Wire Headers
              </div>
              <pre className="p-3 bg-[#0c0c0e] border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                {!activeProfile.telepresence.enabled
                  ? '# Telepresence disabled'
                  : [
                      activeProfile.telepresence.interceptId.trim()
                        ? `x-telepresence-intercept-id: ${activeProfile.telepresence.interceptId.trim()}`
                        : null,
                      (activeProfile.telepresence.propagateBaggage &&
                        activeProfile.telepresence.interceptId.trim()) ||
                      activeProfile.telepresence.baggageHeader.trim()
                        ? `baggage: ${
                            activeProfile.telepresence.baggageHeader.trim() ||
                            `telepresence-intercept-id=${activeProfile.telepresence.interceptId.trim()}`
                          }`
                        : null,
                      activeProfile.telepresence.customHeaderName.trim() &&
                      activeProfile.telepresence.customHeaderValue.trim()
                        ? `${activeProfile.telepresence.customHeaderName.trim()}: ${activeProfile.telepresence.customHeaderValue.trim()}`
                        : null,
                      activeProfile.telepresence.envoyForceTrace
                        ? 'x-envoy-force-trace: true'
                        : null,
                    ]
                      .filter(Boolean)
                      .join('\n') || '# No intercept ID set'}
              </pre>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: BODY OVERRIDE (Split Master-Detail View)                     */}
        {/* =================================================================== */}
        {activeTab === 'body' && (
          <div className="grid grid-cols-12 h-[468px]">
            {/* Left Sidebar: Rule List */}
            <div className="col-span-4 border-r border-zinc-800 flex flex-col bg-[#141417]">
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-800">
                <span className="text-[11px] font-medium text-zinc-400">Rules</span>
                <button
                  onClick={addBodyRule}
                  className="h-5 px-1.5 flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
                {activeProfile.bodyRules.map((rule) => (
                  <div
                    key={rule.id}
                    onClick={() => setExpandedBodyId(rule.id)}
                    className={`flex items-center justify-between px-2.5 py-2 cursor-pointer text-xs ${
                      expandedBodyId === rule.id
                        ? 'bg-zinc-800/80 text-zinc-100'
                        : 'text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          updateBodyRule(rule.id, { enabled: e.target.checked })
                        }
                        className="accent-blue-500"
                      />
                      <div className="truncate">
                        <div className="font-mono text-[11px] truncate text-zinc-200">
                          {rule.urlPattern || '*'}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {rule.method} • {rule.mode.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBodyRule(rule.id);
                      }}
                      className="text-zinc-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Pane: Rule Editor */}
            <div className="col-span-8 p-3 flex flex-col h-full">
              {(() => {
                const selected =
                  activeProfile.bodyRules.find((r) => r.id === expandedBodyId) ||
                  activeProfile.bodyRules[0];
                if (!selected) {
                  return (
                    <div className="m-auto text-zinc-500 text-xs">
                      Select or create a body rule to edit payload.
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col h-full gap-2.5">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-3">
                        <label className="block text-[10px] text-zinc-500 mb-0.5">
                          Method
                        </label>
                        <select
                          value={selected.method}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              method: e.target.value as BodyRule['method'],
                            })
                          }
                          className="w-full h-6 px-1.5 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200"
                        >
                          <option value="ALL">ALL</option>
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="PATCH">PATCH</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>

                      <div className="col-span-9">
                        <label className="block text-[10px] text-zinc-500 mb-0.5">
                          URL Match (Substring or Wildcard *)
                        </label>
                        <input
                          type="text"
                          value={selected.urlPattern}
                          onChange={(e) =>
                            updateBodyRule(selected.id, { urlPattern: e.target.value })
                          }
                          placeholder="/api/v1/users"
                          className="w-full h-6 px-2 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6">
                        <label className="block text-[10px] text-zinc-500 mb-0.5">
                          Action Mode
                        </label>
                        <select
                          value={selected.mode}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              mode: e.target.value as BodyRuleMode,
                            })
                          }
                          className="w-full h-6 px-1.5 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200"
                        >
                          <option value="merge_response_json">
                            Response: Shallow Merge JSON
                          </option>
                          <option value="replace_response">
                            Response: Replace Full Body (Mock)
                          </option>
                          <option value="merge_request_json">
                            Request: Shallow Merge JSON
                          </option>
                          <option value="replace_request">
                            Request: Replace Full Body
                          </option>
                        </select>
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] text-zinc-500 mb-0.5">
                          Status Code
                        </label>
                        <input
                          type="number"
                          value={selected.statusCode || 200}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              statusCode: Number(e.target.value) || 200,
                            })
                          }
                          className="w-full h-6 px-2 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] text-zinc-500 mb-0.5">
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
                          className="w-full h-6 px-2 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200"
                        />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-zinc-500 uppercase">
                          Payload (JSON / Text)
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
                            } catch {
                              // ignore invalid json
                            }
                          }}
                          className="text-[10px] text-blue-400 hover:underline"
                        >
                          Prettify JSON
                        </button>
                      </div>
                      <textarea
                        value={selected.bodyContent}
                        onChange={(e) =>
                          updateBodyRule(selected.id, { bodyContent: e.target.value })
                        }
                        spellCheck={false}
                        className="flex-1 w-full p-2.5 bg-[#0c0c0e] border border-zinc-800 text-[11px] font-mono text-zinc-200 resize-none focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CORS / REDIRECT                                              */}
        {/* =================================================================== */}
        {activeTab === 'network' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#16161a] border-b border-zinc-800">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => addRedirectCorsRule('cors_bypass')}
                  className="h-6 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] border border-zinc-700"
                >
                  + CORS Rule
                </button>
                <button
                  onClick={() => addRedirectCorsRule('redirect')}
                  className="h-6 px-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium"
                >
                  + URL Redirect
                </button>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                declarativeNetRequest rules
              </span>
            </div>

            <div className="divide-y divide-zinc-800/70">
              {activeProfile.redirectCorsRules.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No CORS or URL redirect rules configured.
                </div>
              ) : (
                activeProfile.redirectCorsRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`grid grid-cols-12 gap-2 px-3 py-2 items-center ${
                      !rule.enabled ? 'opacity-45' : ''
                    }`}
                  >
                    <div className="col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) =>
                          updateRedirectCorsRule(rule.id, { enabled: e.target.checked })
                        }
                        className="accent-blue-500"
                      />
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300">
                        {rule.type === 'cors_bypass' ? 'CORS' : '307'}
                      </span>
                    </div>

                    <div className={rule.type === 'cors_bypass' ? 'col-span-9' : 'col-span-4'}>
                      <input
                        type="text"
                        value={rule.sourceUrlFilter}
                        onChange={(e) =>
                          updateRedirectCorsRule(rule.id, {
                            sourceUrlFilter: e.target.value,
                          })
                        }
                        placeholder="Source URL filter (* or regex)"
                        className="w-full h-6 px-2 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-100"
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
                          className="w-full h-6 px-2 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200"
                        />
                      </div>
                    )}

                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => deleteRedirectCorsRule(rule.id)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: TRAFFIC LOG                                                  */}
        {/* =================================================================== */}
        {activeTab === 'logs' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#16161a] border-b border-zinc-800 text-[11px]">
              <span className="text-zinc-400">
                Intercepted Fetch / XHR Mutations ({state.logs.length})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => loadExtensionState().then(setState)}
                  className="h-6 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
                >
                  Refresh
                </button>
                <button
                  onClick={() => updateState((prev) => ({ ...prev, logs: [] }))}
                  className="h-6 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-red-400"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="divide-y divide-zinc-800/60 font-mono text-[11px]">
              {state.logs.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 font-sans text-xs">
                  No body mutations recorded yet.
                </div>
              ) : (
                state.logs.map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-12 gap-2 px-3 py-1.5 items-center hover:bg-zinc-900/50"
                  >
                    <div className="col-span-1 text-zinc-400 font-semibold">
                      {log.method}
                    </div>
                    <div className="col-span-6 truncate text-zinc-200" title={log.url}>
                      {log.url}
                    </div>
                    <div className="col-span-3 truncate text-zinc-400">
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
    </div>
  );
}
