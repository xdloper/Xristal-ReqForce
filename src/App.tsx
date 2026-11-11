import React, { useEffect, useMemo, useState } from 'react';
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
  Moon,
  Plus,
  RotateCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
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
  LocalePreference,
  Profile,
  RedirectCorsRule,
  TelepresenceConfig,
  ThemePreference,
} from './types/extension';
import { XristalLogo } from './components/XristalLogo';
import { fill, getMessages, Messages, resolveLocale } from './i18n/messages';
import {
  applyThemeToDocument,
  resolveTheme,
} from './utils/theme';
import {
  extApi,
  INITIAL_STATE,
  loadExtensionState,
  saveExtensionState,
} from './utils/browser';

type TabType = 'headers' | 'body' | 'routing' | 'logs' | 'settings';

function getAppVersion(): string {
  try {
    return extApi?.runtime?.getManifest?.()?.version || '—';
  } catch {
    return '—';
  }
}

const HEADER_TEMPLATES: Array<{
  labelKey: keyof Messages;
  name: string;
  value: string;
  target: HeaderTarget;
  op: HeaderOperation;
}> = [
  { labelKey: 'tplBearer', name: 'Authorization', value: 'Bearer ', target: 'request', op: 'set' },
  { labelKey: 'tplApiKey', name: 'X-API-Key', value: '', target: 'request', op: 'set' },
  { labelKey: 'tplNoCache', name: 'Cache-Control', value: 'no-cache, no-store', target: 'request', op: 'set' },
  { labelKey: 'tplSpoofIp', name: 'X-Forwarded-For', value: '127.0.0.1', target: 'request', op: 'set' },
  { labelKey: 'tplTenantId', name: 'X-Tenant-ID', value: 'staging-tenant', target: 'request', op: 'set' },
  { labelKey: 'tplStripCsp', name: 'Content-Security-Policy', value: '', target: 'response', op: 'remove' },
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
        checked ? 'bg-blue-600' : 'bg-rf-strong/80 hover:bg-rf-strong'
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
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'tokens' | 'mutated' | 'errors'>('all');
  const [inspectorSection, setInspectorSection] = useState<
    'overview' | 'reqHeaders' | 'reqBody' | 'resBody' | 'resHeaders'
  >('overview');

  const t = useMemo(() => getMessages(state.locale), [state.locale]);
  const resolvedLocale = useMemo(
    () => resolveLocale(state.locale),
    [state.locale]
  );
  const resolvedTheme = useMemo(
    () => resolveTheme(state.theme),
    [state.theme]
  );
  const appVersion = useMemo(() => getAppVersion(), []);

  useEffect(() => {
    document.documentElement.lang = resolvedLocale;
  }, [resolvedLocale]);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (state.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyThemeToDocument(resolveTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [state.theme]);

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

  const setLocale = (locale: LocalePreference) => {
    updateState((prev) => ({ ...prev, locale }));
  };

  const setTheme = (theme: ThemePreference) => {
    updateState((prev) => ({ ...prev, theme }));
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
      showToast(t.toastOpenHttpTab);
      return;
    }
    updateActiveProfile((prof) => ({
      ...prof,
      headerRules: prof.headerRules.map((r) => ({
        ...r,
        urlFilter: activeDomainPattern,
      })),
    }));
    showToast(fill(t.toastScoped, { pattern: activeDomainPattern }));
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
      fill(t.toastImported, {
        n: importedHeaders.length,
        body: importedBody ? t.toastImportedBodySuffix : '',
      })
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
    showToast(t.toastDuplicated);
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
      name: t.newEndpointOverride,
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
          ? t.defaultCorsBypassName
          : type === 'query_param'
          ? t.defaultQueryParamName
          : t.defaultRedirectName,
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
    showToast(fill(t.toastWorkspaceCreated, { name: nextProf.name }));
  };

  const deleteCurrentProfile = () => {
    if (state.profiles.length <= 1) return;
    const remaining = state.profiles.filter((p) => p.id !== activeProfile.id);
    updateState((prev) => ({
      ...prev,
      activeProfileId: remaining[0].id,
      profiles: remaining,
    }));
    showToast(t.toastWorkspaceRemoved);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reqforce-${activeProfile.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t.toastExported);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (parsed && Array.isArray(parsed.profiles)) {
          updateState(() => ({
            ...INITIAL_STATE,
            ...parsed,
            locale: parsed.locale ?? state.locale ?? 'system',
            theme: parsed.theme ?? state.theme ?? 'system',
          }));
          showToast(t.toastImportedConfig);
        }
      } catch {
        showToast(t.toastInvalidJson);
      }
    };
    reader.readAsText(file);
  };

  const reloadTab = async () => {
    if (extApi?.tabs) {
      const [tab] = await extApi.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        extApi.tabs.reload(tab.id);
        showToast(t.toastReloaded);
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
    <div className="flex flex-col w-[780px] h-[560px] bg-rf-base text-rf-2 select-none overflow-hidden">
      {/* Top Application Header */}
      <header className="flex items-center justify-between gap-3 h-12 px-3.5 bg-rf-raised border-b border-rf-border shrink-0">
        {/* Left: Logo, Brand & Workspace */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <XristalLogo
              className="h-7 w-7 shrink-0"
              disabled={!state.globalEnabled}
            />
            <div className="leading-tight">
              <div className="font-semibold text-[13px] tracking-tight text-rf-1">
                ReqForce
              </div>
              <div className="text-[9px] text-rf-5 font-medium">by Xristal</div>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-rf-border shrink-0" />

          {addingProfile ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createProfile()}
                placeholder={t.workspaceNamePlaceholder}
                autoFocus
                className="h-6 px-2 text-[11px] rounded bg-rf-input border border-rf-border-strong text-rf-1 focus:outline-none focus:border-blue-500 w-32"
              />
              <button
                onClick={createProfile}
                className="h-6 px-2 text-[11px] rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                {t.add}
              </button>
              <button
                onClick={() => setAddingProfile(false)}
                className="h-6 px-1.5 text-[11px] text-rf-5 hover:text-rf-3"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 h-7 px-2 rounded-md bg-rf-input/90 border border-rf-border hover:border-rf-border-strong transition-colors">
                <Layers className="w-3 h-3 text-rf-4" />
                <select
                  value={activeProfile.id}
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      activeProfileId: e.target.value,
                    }))
                  }
                  className="bg-transparent text-[11px] font-medium text-rf-2 focus:outline-none cursor-pointer pr-1"
                >
                  {state.profiles.map((p) => (
                    <option key={p.id} value={p.id} className="bg-rf-input text-rf-1">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setAddingProfile(true)}
                title={t.newWorkspace}
                className="h-7 w-7 rounded-md flex items-center justify-center text-rf-4 hover:text-rf-1 hover:bg-rf-hover/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {state.profiles.length > 1 && (
                <button
                  onClick={deleteCurrentProfile}
                  title={t.deleteWorkspace}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-rf-5 hover:text-red-400 hover:bg-rf-hover/80 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: cURL + Master Toggle — language/theme live under Settings */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowCurlModal(true)}
            title={t.importCurlTitle}
            className="h-7 px-2.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium text-rf-3 hover:text-rf-1 bg-rf-input hover:bg-rf-hover border border-rf-border transition-colors"
          >
            <Terminal className="w-3 h-3 text-blue-400" />
            <span>{t.importCurl}</span>
          </button>

          <div className="h-4 w-[1px] bg-rf-border mx-0.5" />

          <div
            onClick={() =>
              updateState((prev) => ({
                ...prev,
                globalEnabled: !prev.globalEnabled,
              }))
            }
            title={t.enablePauseTitle}
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
              {state.globalEnabled ? t.active : t.passive}
            </span>
          </div>
        </div>
      </header>

      {/* Global Paused Banner */}
      {!state.globalEnabled && (
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-rose-500/10 border-b border-rose-500/25 text-[11px] text-rose-300">
          <span>{t.pausedBanner}</span>
          <button
            onClick={() =>
              updateState((prev) => ({ ...prev, globalEnabled: true }))
            }
            className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-medium text-[10px]"
          >
            {t.enableNow}
          </button>
        </div>
      )}

      {/* Wildcard rule safety warning — these can break cookies / Bearer auth on real sites */}
      {state.globalEnabled &&
        activeProfile.headerRules.some(
          (r) =>
            r.enabled &&
            (!r.urlFilter || r.urlFilter === '*') &&
            ['authorization', 'cookie', 'x-debug-mode'].includes(
              r.name.trim().toLowerCase()
            )
        ) && (
          <div className="px-3.5 py-1.5 bg-amber-500/10 border-b border-amber-500/25 text-[11px] text-amber-300">
            {t.wildcardWarning}
          </div>
        )}

      {/* Navigation Bar */}
      <nav className="flex items-center justify-between h-9 px-3.5 bg-rf-sunken border-b border-rf-border shrink-0">
        <div className="flex items-center h-full min-w-0 overflow-x-auto">
          {(
            [
              {
                id: 'headers' as const,
                label: t.tabHeaders,
                icon: SlidersHorizontal,
                count: activeHeaders,
              },
              {
                id: 'body' as const,
                label: t.tabBody,
                icon: FileCode2,
                count: activeBodies,
              },
              {
                id: 'routing' as const,
                label: t.tabRouting,
                icon: ArrowRightLeft,
                count: activeRouting,
              },
              {
                id: 'logs' as const,
                label: t.tabInspector,
                icon: Activity,
                count: state.logs.length,
              },
              {
                id: 'settings' as const,
                label: t.tabSettings,
                icon: Settings,
                count: 0,
                iconOnly: true,
              },
            ]
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                title={tab.label}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'logs') {
                    loadExtensionState().then(setState);
                  }
                }}
                className={`h-full px-2.5 flex items-center gap-1.5 border-b-2 text-[11px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-500 text-rf-1 bg-rf-input/50'
                    : 'border-transparent text-rf-4 hover:text-rf-2'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {!tab.iconOnly && <span>{tab.label}</span>}
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 rounded text-[10px] font-mono-code leading-4 ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-rf-hover text-rf-4'
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
              title={`${t.pinDomainTitle} (${activeDomainPattern})`}
              className="h-6 px-2 rounded flex items-center gap-1 bg-rf-input hover:bg-rf-hover border border-rf-border text-[10px] text-rf-3"
            >
              <Crosshair className="w-3 h-3 text-emerald-400" />
              <span>{t.pinDomain}</span>
            </button>
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-rf-5 absolute left-2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.filterPlaceholder}
                className="h-6 pl-6 pr-2 w-32 rounded bg-rf-input border border-rf-border text-[11px] text-rf-2 placeholder-rf-5 focus:outline-none focus:border-rf-border-strong"
              />
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* =================================================================== */}
        {/* TAB 1: HTTP HEADERS                                                 */}
        {/* =================================================================== */}
        {activeTab === 'headers' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3.5 py-2 bg-rf-raised/60 border-b border-rf-border/70">
              <div className="flex items-center gap-1 flex-wrap">
                {HEADER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.labelKey}
                    onClick={() =>
                      addHeaderRule(tpl.name, tpl.value, tpl.target, tpl.op)
                    }
                    className="h-6 px-2 rounded bg-rf-input hover:bg-rf-hover text-rf-3 border border-rf-border hover:border-rf-border-strong text-[11px] transition-colors"
                  >
                    + {t[tpl.labelKey]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {activeProfile.headerRules.length > 1 && (
                  <button
                    onClick={() => toggleAllHeaders(activeHeaders === 0)}
                    className="h-6 px-2 rounded bg-rf-input hover:bg-rf-hover border border-rf-border text-[10px] text-rf-4 hover:text-rf-2"
                  >
                    {activeHeaders === 0 ? t.enableAll : t.disableAll}
                  </button>
                )}
                <button
                  onClick={() => addHeaderRule()}
                  className="h-6 px-2.5 rounded flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addRule}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 px-3.5 py-1.5 bg-rf-sunken border-b border-rf-border/80 text-[10px] font-semibold uppercase tracking-wider text-rf-5">
              <div className="col-span-3">{t.colTargetAction}</div>
              <div className="col-span-3">{t.colHeaderName}</div>
              <div className="col-span-4">{t.colHeaderValue}</div>
              <div className="col-span-2">{t.colUrlPattern}</div>
            </div>

            <div className="divide-y divide-rf-border/50">
              {filteredHeaders.length === 0 ? (
                <div className="py-16 text-center text-rf-5 text-xs">
                  {t.noHeaderRules}
                </div>
              ) : (
                filteredHeaders.map((rule) => (
                  <div
                    key={rule.id}
                    className={`grid grid-cols-12 gap-2 px-3.5 py-2 items-center transition-colors hover:bg-rf-input/30 ${
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
                        <option value="request" className="bg-rf-input text-rf-2">
                          REQ
                        </option>
                        <option value="response" className="bg-rf-input text-rf-2">
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
                        className="h-6 px-1.5 rounded bg-rf-input border border-rf-border text-[11px] text-rf-3 focus:outline-none focus:border-rf-border-strong"
                      >
                        <option value="set">{t.set}</option>
                        <option value="append">{t.append}</option>
                        <option value="remove">{t.remove}</option>
                      </select>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) =>
                          updateHeaderRule(rule.id, { name: e.target.value })
                        }
                        placeholder={t.headerNamePlaceholder}
                        className="w-full h-6 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-rf-1 placeholder-rf-6 focus:outline-none focus:border-blue-500"
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
                            ? t.headerWillBeStripped
                            : t.headerValuePlaceholder
                        }
                        className="w-full h-6 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-emerald-300 placeholder-rf-6 disabled:opacity-40 focus:outline-none focus:border-blue-500"
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
                        className="w-full h-6 px-1.5 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-rf-4 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => duplicateHeaderRule(rule)}
                        title={t.duplicateRule}
                        className="h-6 w-5 rounded shrink-0 flex items-center justify-center text-rf-5 hover:text-rf-2"
                      >
                        <CopyPlus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteHeaderRule(rule.id)}
                        title={t.deleteRule}
                        className="h-6 w-5 rounded shrink-0 flex items-center justify-center text-rf-5 hover:text-red-400"
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
            <div className="col-span-4 border-r border-rf-border/80 flex flex-col bg-rf-sunken">
              <div className="flex items-center justify-between px-3 py-2 border-b border-rf-border/80">
                <span className="text-[11px] font-medium text-rf-4">
                  {t.bodyRules} ({activeProfile.bodyRules.length})
                </span>
                <button
                  onClick={addBodyRule}
                  className="h-6 px-2 rounded flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium"
                >
                  <Plus className="w-3 h-3" /> {t.new}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-rf-border/50">
                {activeProfile.bodyRules.length === 0 ? (
                  <div className="p-6 text-center text-rf-5 text-xs">
                    {t.noBodyRules}
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
                            ? 'bg-blue-600/10 border-l-2 border-l-blue-500 text-rf-1'
                            : 'text-rf-4 hover:bg-rf-input/60'
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
                            <div className="text-[11px] font-medium text-rf-2 truncate">
                              {rule.name || rule.urlPattern}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono-code px-1 rounded bg-rf-hover text-blue-300">
                                {rule.method}
                              </span>
                              <span className="text-[10px] font-mono-code text-rf-5 truncate">
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
                          className="text-rf-5 hover:text-red-400 p-1 rounded hover:bg-rf-hover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="col-span-8 p-3.5 flex flex-col h-full bg-rf-base">
              {(() => {
                const selected =
                  activeProfile.bodyRules.find((r) => r.id === selectedBodyId) ||
                  activeProfile.bodyRules[0];
                if (!selected) {
                  return (
                    <div className="m-auto text-rf-5 text-xs">
                      {t.selectBodyRule}
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col h-full gap-3">
                    <div className="grid grid-cols-12 gap-2.5">
                      <div className="col-span-5">
                        <label className="block text-[10px] font-medium text-rf-4 mb-1">
                          {t.ruleName}
                        </label>
                        <input
                          type="text"
                          value={selected.name}
                          onChange={(e) =>
                            updateBodyRule(selected.id, { name: e.target.value })
                          }
                          placeholder={t.ruleNamePlaceholder}
                          className="w-full h-7 px-2.5 rounded bg-rf-input border border-rf-border text-xs text-rf-1 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="col-span-7">
                        <label className="block text-[10px] font-medium text-rf-4 mb-1">
                          {t.mutationStrategy}
                        </label>
                        <select
                          value={selected.mode}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              mode: e.target.value as BodyRuleMode,
                            })
                          }
                          className="w-full h-7 px-2 rounded bg-rf-input border border-rf-border text-xs text-blue-300 font-medium focus:outline-none focus:border-blue-500"
                        >
                          <option value="merge_response_json">
                            {t.modeMergeResponse}
                          </option>
                          <option value="replace_response">
                            {t.modeReplaceResponse}
                          </option>
                          <option value="merge_request_json">
                            {t.modeMergeRequest}
                          </option>
                          <option value="replace_request">
                            {t.modeReplaceRequest}
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2.5">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-rf-4 mb-1">
                          {t.method}
                        </label>
                        <select
                          value={selected.method}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              method: e.target.value as BodyRule['method'],
                            })
                          }
                          className="w-full h-7 px-1.5 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-rf-2"
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
                        <label className="block text-[10px] font-medium text-rf-4 mb-1">
                          {t.urlPatternLabel}
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
                          className="w-full h-7 px-2.5 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-rf-1 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-rf-4 mb-1">
                          {t.httpStatus}
                        </label>
                        <input
                          type="number"
                          value={selected.statusCode || 200}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              statusCode: Number(e.target.value) || 200,
                            })
                          }
                          className="w-full h-7 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-emerald-300"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-rf-4 mb-1">
                          {t.delayMs}
                        </label>
                        <input
                          type="number"
                          value={selected.delayMs || 0}
                          onChange={(e) =>
                            updateBodyRule(selected.id, {
                              delayMs: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full h-7 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-amber-300"
                        />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-rf-4">
                          {t.jsonPayload}
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
                              showToast(t.toastFormattedJson);
                            } catch {
                              showToast(t.toastInvalidJsonSyntax);
                            }
                          }}
                          className="text-[11px] text-blue-400 hover:text-blue-300"
                        >
                          {t.formatJson}
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
                        className="flex-1 w-full p-3 rounded-md bg-rf-deep border border-rf-border font-mono-code text-[11px] text-emerald-300 resize-none focus:outline-none focus:border-blue-500 leading-relaxed"
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
            <div className="rounded-lg bg-rf-raised border border-rf-border/80 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-rf-border">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-rf-1">
                    {t.corsSectionTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => addRedirectCorsRule('cors_bypass')}
                    className="h-6 px-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium"
                  >
                    {t.corsBypass}
                  </button>
                  <button
                    onClick={() => addRedirectCorsRule('query_param')}
                    className="h-6 px-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium"
                  >
                    {t.queryParam}
                  </button>
                  <button
                    onClick={() => addRedirectCorsRule('redirect')}
                    className="h-6 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium"
                  >
                    {t.urlRedirect}
                  </button>
                </div>
              </div>

              <div className="divide-y divide-rf-border/60">
                {activeProfile.redirectCorsRules.length === 0 ? (
                  <div className="py-8 text-center text-rf-5 text-xs">
                    {t.noRoutingRules}
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
                          placeholder={t.sourceUrlPlaceholder}
                          className="w-full h-6 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-rf-1"
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
                            className="w-full h-6 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-emerald-300"
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
                            className="w-full h-6 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-amber-300"
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
                            className="w-full h-6 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-emerald-300"
                          />
                        </div>
                      )}

                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => deleteRedirectCorsRule(rule.id)}
                          className="text-rf-5 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg bg-rf-raised border border-rf-border/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                  <div>
                    <span className="text-xs font-semibold text-rf-1">
                      {t.clusterTitle}
                    </span>
                    <p className="text-[11px] text-rf-5">
                      {t.clusterHint}
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
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-rf-border/80">
                  <div>
                    <label className="block text-[10px] font-medium text-rf-4 mb-1">
                      {t.interceptId}
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={activeProfile.telepresence.interceptId}
                        onChange={(e) => handleInterceptPaste(e.target.value)}
                        placeholder={t.interceptPlaceholder}
                        className="flex-1 h-7 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-rf-1 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            activeProfile.telepresence.interceptId
                          );
                          setCopiedId(true);
                          setTimeout(() => setCopiedId(false), 1200);
                        }}
                        className="h-7 px-2 rounded bg-rf-input hover:bg-rf-hover border border-rf-border text-rf-4"
                        title={t.copyId}
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
                    <label className="block text-[10px] font-medium text-rf-4 mb-1">
                      {t.otelBaggage}
                    </label>
                    <input
                      type="text"
                      value={activeProfile.telepresence.baggageHeader}
                      onChange={(e) =>
                        updateContextRouting({ baggageHeader: e.target.value })
                      }
                      placeholder="key1=val1,key2=val2"
                      className="w-full h-7 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-rf-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-rf-4 mb-1">
                        {t.customContextHeader}
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
                        className="w-full h-7 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-rf-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-rf-4 mb-1">
                        {t.value}
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
                        className="w-full h-7 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-rf-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-rf-4 mb-1">
                      {t.targetHostScope}
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
                      className="w-full h-7 px-2 rounded bg-rf-input border border-rf-border font-mono-code text-[11px] text-rf-2"
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-xs text-rf-3 cursor-pointer">
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
                      <span>{t.syncInterceptBaggage}</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-rf-3 cursor-pointer">
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
                      <span>{t.injectEnvoyTrace}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: DEEP TRAFFIC & TOKEN INSPECTOR                               */}
        {/* =================================================================== */}
        {activeTab === 'logs' &&
          (() => {
            const q = logSearch.trim().toLowerCase();
            const filteredLogs = state.logs.filter((log) => {
              if (logFilter === 'tokens' && (!log.tokens || log.tokens.length === 0)) {
                return false;
              }
              if (logFilter === 'mutated' && !log.mutated) return false;
              if (logFilter === 'errors' && (!log.status || log.status < 400)) {
                return false;
              }
              if (!q) return true;
              const hay = [
                log.url,
                log.pageUrl || '',
                log.method,
                log.ruleName,
                log.requestBody || '',
                log.responseBody || '',
                JSON.stringify(log.requestHeaders || {}),
                JSON.stringify(log.tokens || []),
              ]
                .join(' ')
                .toLowerCase();
              return hay.includes(q);
            });

            const activeLog =
              filteredLogs.find((l) => l.id === selectedLogId) ||
              filteredLogs[0] ||
              null;

            const shortUrl = (raw?: string) => {
              if (!raw) return '—';
              try {
                const u = new URL(raw);
                return `${u.host}${u.pathname}${u.search}`;
              } catch {
                return raw;
              }
            };

            const shortPage = (raw?: string) => {
              if (!raw) return 'page';
              try {
                const u = new URL(raw);
                return `${u.host}${u.pathname === '/' ? '' : u.pathname}`;
              } catch {
                return raw;
              }
            };

            const formatPretty = (raw?: string) => {
              if (!raw) return '';
              try {
                return JSON.stringify(JSON.parse(raw), null, 2);
              } catch {
                return raw;
              }
            };

            const channelBadge = (ch: string) => {
              switch (ch) {
                case 'header':
                  return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
                case 'body':
                  return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
                case 'query':
                  return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                default:
                  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
              }
            };

            return (
              <div className="flex flex-col h-full">
                {/* Top toolbar: Monitor switch + Filter chips + Search + Refresh/Clear */}
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-rf-raised border-b border-rf-border text-[11px] shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <label className="flex items-center gap-1.5 text-rf-2 cursor-pointer shrink-0">
                      <Switch
                        checked={state.trafficMonitorEnabled !== false}
                        onChange={(val) =>
                          updateState((prev) => ({
                            ...prev,
                            trafficMonitorEnabled: val,
                          }))
                        }
                      />
                      <span className="text-[10px] font-medium">{t.monitorAll}</span>
                    </label>

                    <div className="h-3.5 w-[1px] bg-rf-border shrink-0" />

                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: 'all' as const, label: t.inspectorFilterAll },
                          { id: 'tokens' as const, label: t.inspectorFilterTokens },
                          { id: 'mutated' as const, label: t.inspectorFilterMutated },
                          { id: 'errors' as const, label: t.inspectorFilterErrors },
                        ]
                      ).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setLogFilter(f.id)}
                          className={`h-5 px-2 rounded text-[10px] font-medium transition-colors ${
                            logFilter === f.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-rf-input text-rf-4 hover:text-rf-2 border border-rf-border'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative flex items-center">
                      <Search className="w-3 h-3 text-rf-5 absolute left-2 pointer-events-none" />
                      <input
                        type="text"
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        placeholder={t.inspectorSearchPlaceholder}
                        className="h-6 pl-6 pr-2 w-44 rounded bg-rf-input border border-rf-border text-[11px] text-rf-2 placeholder-rf-5 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => loadExtensionState().then(setState)}
                      className="h-6 px-2 rounded bg-rf-input hover:bg-rf-hover border border-rf-border text-rf-3 text-[10px]"
                    >
                      {t.refresh}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLogId(null);
                        updateState((prev) => ({ ...prev, logs: [] }));
                      }}
                      className="h-6 px-2 rounded bg-rf-input hover:bg-rf-hover border border-rf-border text-rf-4 hover:text-red-400 text-[10px]"
                    >
                      {t.clear}
                    </button>
                  </div>
                </div>

                {/* Master-Detail Split */}
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center text-rf-5 text-xs">
                    {t.noTraffic}
                  </div>
                ) : (
                  <div className="grid grid-cols-12 flex-1 min-h-0">
                    {/* Left: Request list with Source Page → Target URL & Token chips */}
                    <div className="col-span-5 border-r border-rf-border overflow-y-auto divide-y divide-rf-border/60 bg-rf-sunken">
                      {filteredLogs.map((log) => {
                        const isSelected = activeLog?.id === log.id;
                        const statusColor =
                          !log.status
                            ? 'text-rf-4'
                            : log.status >= 400
                            ? 'text-rose-400'
                            : log.status >= 300
                            ? 'text-amber-300'
                            : 'text-emerald-400';

                        return (
                          <div
                            key={log.id}
                            onClick={() => setSelectedLogId(log.id)}
                            className={`px-2.5 py-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-600/15 border-l-2 border-l-blue-500'
                                : log.mutated
                                ? 'bg-amber-500/5 hover:bg-rf-input/60'
                                : 'hover:bg-rf-input/60'
                            }`}
                          >
                            {/* Row 1: Method + Status + Target URL */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-code bg-blue-500/15 text-blue-300 font-semibold shrink-0">
                                {log.method}
                              </span>
                              <span
                                className={`text-[10px] font-mono-code font-semibold shrink-0 ${statusColor}`}
                              >
                                {log.status ?? '—'}
                              </span>
                              <span
                                className="text-[11px] font-mono-code text-rf-1 truncate"
                                title={log.url}
                              >
                                {shortUrl(log.url)}
                              </span>
                            </div>

                            {/* Row 2: Page → Target host flow + duration */}
                            <div className="flex items-center justify-between gap-1 mt-1 text-[10px] text-rf-5">
                              <span className="truncate font-mono-code" title={log.pageUrl}>
                                {shortPage(log.pageUrl)} → {log.targetHost || 'host'}
                              </span>
                              <span className="shrink-0 font-mono-code">
                                {log.durationMs != null ? `${log.durationMs}ms` : ''}
                              </span>
                            </div>

                            {/* Row 3: Token channel badges + Mutated badge */}
                            {((log.tokens && log.tokens.length > 0) || log.mutated) && (
                              <div className="flex items-center gap-1 flex-wrap mt-1">
                                {log.tokens?.map((tk, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-1.5 py-0.2 rounded border text-[9px] font-mono-code uppercase ${channelBadge(
                                      tk.channel
                                    )}`}
                                  >
                                    🔑 {tk.channel}: {tk.key}
                                  </span>
                                ))}
                                {log.mutated && (
                                  <span className="px-1.5 py-0.2 rounded border border-amber-500/30 bg-amber-500/15 text-amber-300 text-[9px] font-mono-code">
                                    ⚡ {log.ruleName}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Right: Selected Request Deep Detail */}
                    <div className="col-span-7 flex flex-col min-h-0 bg-rf-base">
                      {!activeLog ? (
                        <div className="m-auto text-rf-5 text-xs px-6 text-center">
                          {t.inspectorSelectHint}
                        </div>
                      ) : (
                        <>
                          {/* Sub-tabs inside detail pane */}
                          <div className="flex items-center gap-1 px-3 h-8 bg-rf-raised border-b border-rf-border shrink-0">
                            {(
                              [
                                { id: 'overview' as const, label: 'Flow & Tokens' },
                                {
                                  id: 'reqHeaders' as const,
                                  label: `${t.inspectorReqHeaders} (${
                                    Object.keys(activeLog.requestHeaders || {}).length
                                  })`,
                                },
                                { id: 'reqBody' as const, label: t.inspectorReqBody },
                                { id: 'resBody' as const, label: t.inspectorResBody },
                                {
                                  id: 'resHeaders' as const,
                                  label: `${t.inspectorResHeaders} (${
                                    Object.keys(activeLog.responseHeaders || {}).length
                                  })`,
                                },
                              ]
                            ).map((sec) => (
                              <button
                                key={sec.id}
                                onClick={() => setInspectorSection(sec.id)}
                                className={`h-6 px-2 rounded text-[10px] font-medium transition-colors ${
                                  inspectorSection === sec.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-rf-4 hover:text-rf-2 hover:bg-rf-hover'
                                }`}
                              >
                                {sec.label}
                              </button>
                            ))}
                          </div>

                          <div className="p-3 overflow-y-auto flex-1 space-y-3 font-mono-code text-[11px]">
                            {inspectorSection === 'overview' && (
                              <>
                                {/* Source Page → Target Endpoint card */}
                                <div className="rounded-md bg-rf-raised border border-rf-border p-2.5 space-y-1.5">
                                  <div>
                                    <span className="text-[9px] uppercase font-sans font-semibold text-rf-5">
                                      {t.inspectorSourcePage}
                                    </span>
                                    <div className="text-rf-2 break-all">
                                      {activeLog.pageUrl || '—'}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-[9px] uppercase font-sans font-semibold text-rf-5">
                                      {t.inspectorTargetUrl}
                                    </span>
                                    <div className="text-blue-300 break-all">
                                      {activeLog.method} {activeLog.url}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 pt-1 text-[10px] text-rf-4 font-sans">
                                    <span>
                                      Status: <strong className="text-rf-1">{activeLog.status ?? '—'}</strong>
                                    </span>
                                    <span>
                                      Credentials: <strong className="text-rf-1">{activeLog.credentials || 'same-origin'}</strong>
                                    </span>
                                    {activeLog.durationMs != null && (
                                      <span>
                                        Time: <strong className="text-rf-1">{activeLog.durationMs} ms</strong>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Token & Auth Radar */}
                                <div className="rounded-md bg-rf-raised border border-rf-border p-2.5 space-y-2">
                                  <div className="text-[10px] font-sans font-semibold text-rf-2">
                                    🔑 {t.inspectorTokenRadar}
                                  </div>
                                  {!activeLog.tokens || activeLog.tokens.length === 0 ? (
                                    <div className="text-[11px] font-sans text-rf-5">
                                      {t.inspectorNoTokens}
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {activeLog.tokens.map((tk, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-rf-input border border-rf-border"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span
                                              className={`px-1.5 py-0.5 rounded border text-[9px] uppercase font-semibold shrink-0 ${channelBadge(
                                                tk.channel
                                              )}`}
                                            >
                                              {tk.channel}
                                            </span>
                                            <span className="text-rf-1 font-semibold truncate">
                                              {tk.key}
                                            </span>
                                          </div>
                                          <span className="text-emerald-300 text-[10px] truncate">
                                            {tk.preview}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Query Params if any */}
                                {activeLog.queryParams &&
                                  Object.keys(activeLog.queryParams).length > 0 && (
                                    <div className="rounded-md bg-rf-raised border border-rf-border p-2.5 space-y-1">
                                      <div className="text-[10px] font-sans font-semibold text-rf-2">
                                        {t.inspectorQueryParams}
                                      </div>
                                      {Object.entries(activeLog.queryParams).map(([k, v]) => (
                                        <div key={k} className="flex justify-between gap-2 text-[11px]">
                                          <span className="text-amber-300">{k}</span>
                                          <span className="text-rf-2 break-all">{v}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                              </>
                            )}

                            {inspectorSection === 'reqHeaders' && (
                              <div className="space-y-1">
                                {!activeLog.requestHeaders ||
                                Object.keys(activeLog.requestHeaders).length === 0 ? (
                                  <div className="text-rf-5 font-sans text-xs py-6 text-center">
                                    {t.inspectorEmpty}
                                  </div>
                                ) : (
                                  Object.entries(activeLog.requestHeaders).map(([k, v]) => (
                                    <div
                                      key={k}
                                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-rf-raised border border-rf-border"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <span className="text-blue-300 font-semibold">{k}: </span>
                                        <span className="text-rf-2 break-all">{v}</span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          addHeaderRule(k, v, 'request', 'set');
                                          showToast(`+ ${k}`);
                                        }}
                                        className="h-5 px-1.5 rounded bg-rf-input hover:bg-rf-hover border border-rf-border text-[9px] font-sans text-rf-3 shrink-0"
                                      >
                                        {t.inspectorAddAsHeaderRule}
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {inspectorSection === 'resHeaders' && (
                              <div className="space-y-1">
                                {!activeLog.responseHeaders ||
                                Object.keys(activeLog.responseHeaders).length === 0 ? (
                                  <div className="text-rf-5 font-sans text-xs py-6 text-center">
                                    {t.inspectorEmpty}
                                  </div>
                                ) : (
                                  Object.entries(activeLog.responseHeaders).map(([k, v]) => (
                                    <div
                                      key={k}
                                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-rf-raised border border-rf-border"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <span className="text-purple-300 font-semibold">{k}: </span>
                                        <span className="text-rf-2 break-all">{v}</span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          addHeaderRule(k, v, 'response', 'set');
                                          showToast(`+ ${k}`);
                                        }}
                                        className="h-5 px-1.5 rounded bg-rf-input hover:bg-rf-hover border border-rf-border text-[9px] font-sans text-rf-3 shrink-0"
                                      >
                                        {t.inspectorAddAsHeaderRule}
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {inspectorSection === 'reqBody' && (
                              <div className="space-y-1.5">
                                {!activeLog.requestBody ? (
                                  <div className="text-rf-5 font-sans text-xs py-6 text-center">
                                    {t.inspectorEmpty}
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-end">
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(activeLog.requestBody || '');
                                          showToast('Copied');
                                        }}
                                        className="h-5 px-2 rounded bg-rf-input hover:bg-rf-hover border border-rf-border text-[10px] font-sans text-rf-3"
                                      >
                                        {t.inspectorCopyBody}
                                      </button>
                                    </div>
                                    <pre className="p-2.5 rounded bg-rf-deep border border-rf-border text-emerald-300 whitespace-pre-wrap break-all leading-relaxed">
                                      {formatPretty(activeLog.requestBody)}
                                    </pre>
                                  </>
                                )}
                              </div>
                            )}

                            {inspectorSection === 'resBody' && (
                              <div className="space-y-1.5">
                                {!activeLog.responseBody ? (
                                  <div className="text-rf-5 font-sans text-xs py-6 text-center">
                                    {t.inspectorEmpty}
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-end">
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(activeLog.responseBody || '');
                                          showToast('Copied');
                                        }}
                                        className="h-5 px-2 rounded bg-rf-input hover:bg-rf-hover border border-rf-border text-[10px] font-sans text-rf-3"
                                      >
                                        {t.inspectorCopyBody}
                                      </button>
                                    </div>
                                    <pre className="p-2.5 rounded bg-rf-deep border border-rf-border text-emerald-300 whitespace-pre-wrap break-all leading-relaxed">
                                      {formatPretty(activeLog.responseBody)}
                                    </pre>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* =================================================================== */}
        {/* TAB 5: SETTINGS — Language, Theme, Version, Structure               */}
        {/* =================================================================== */}
        {activeTab === 'settings' && (
          <div className="p-3.5 space-y-3 overflow-y-auto h-full">
            {/* 1. Language & Theme */}
            <section className="rounded-lg bg-rf-raised border border-rf-border/80 p-3.5 space-y-3">
              <div>
                <h2 className="text-xs font-semibold text-rf-1">
                  {t.settingsAppearance}
                </h2>
                <p className="text-[11px] text-rf-5 mt-0.5">
                  {t.settingsAppearanceHint}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-rf-4 mb-1">
                    {t.language}
                  </label>
                  <select
                    value={state.locale || 'system'}
                    onChange={(e) =>
                      setLocale(e.target.value as LocalePreference)
                    }
                    className="w-full h-8 px-2 rounded bg-rf-input border border-rf-border text-[11px] text-rf-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="system">
                      {t.languageSystem} ({resolvedLocale.toUpperCase()})
                    </option>
                    <option value="en">{t.languageEn}</option>
                    <option value="tr">{t.languageTr}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-rf-4 mb-1">
                    {t.theme}
                  </label>
                  <div className="flex items-center gap-1 h-8 p-0.5 rounded bg-rf-input border border-rf-border">
                    {(
                      [
                        { id: 'system' as const, label: t.themeSystem },
                        { id: 'light' as const, label: t.themeLight, icon: Sun },
                        { id: 'dark' as const, label: t.themeDark, icon: Moon },
                      ]
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const active = (state.theme || 'system') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTheme(opt.id)}
                          className={`flex-1 h-full px-1.5 rounded flex items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                            active
                              ? 'bg-blue-600 text-white'
                              : 'text-rf-4 hover:text-rf-2 hover:bg-rf-hover'
                          }`}
                        >
                          {Icon ? <Icon className="w-3 h-3" /> : null}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Version / About */}
            <section className="rounded-lg bg-rf-raised border border-rf-border/80 p-3.5">
              <h2 className="text-xs font-semibold text-rf-1 mb-2">
                {t.settingsAbout}
              </h2>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-rf-4">{t.settingsVersion}</span>
                <code className="font-mono-code text-emerald-400">v{appVersion}</code>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1.5">
                <span className="text-rf-4">{t.settingsAuthor}</span>
                <span className="text-rf-5">MIT</span>
              </div>
            </section>

            {/* 3. Structural / data tools */}
            <section className="rounded-lg bg-rf-raised border border-rf-border/80 p-3.5 space-y-3">
              <div>
                <h2 className="text-xs font-semibold text-rf-1">
                  {t.settingsStructure}
                </h2>
                <p className="text-[11px] text-rf-5 mt-0.5">
                  {t.settingsStructureHint}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExport}
                  className="h-8 px-3 rounded-md flex items-center gap-1.5 bg-rf-input hover:bg-rf-hover border border-rf-border text-[11px] text-rf-2 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  {t.exportJson}
                </button>
                <label className="h-8 px-3 rounded-md flex items-center gap-1.5 bg-rf-input hover:bg-rf-hover border border-rf-border text-[11px] text-rf-2 font-medium cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  {t.importJson}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={reloadTab}
                  className="h-8 px-3 rounded-md flex items-center gap-1.5 bg-rf-input hover:bg-rf-hover border border-rf-border text-[11px] text-rf-2 font-medium"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  {t.reloadTabTitle}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="h-6 px-3.5 bg-rf-sunken border-t border-rf-border flex items-center justify-between text-[10px] text-rf-5 shrink-0">
        <div className="flex items-center gap-2">
          <span>
            {t.tabScope}: <code className="text-rf-3 font-mono-code">{activeDomainPattern}</code>
          </span>
        </div>
        <span>
          {t.settingsAuthor} · v{appVersion}
        </span>
      </footer>

      {/* cURL Import Modal */}
      {showCurlModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg rounded-lg bg-rf-raised border border-rf-border-strong p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rf-1">
                {t.curlModalTitle}
              </span>
              <button
                onClick={() => setShowCurlModal(false)}
                className="text-rf-4 hover:text-rf-1 text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-rf-4">{t.curlModalHint}</p>
            <textarea
              rows={6}
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              placeholder={`curl 'https://api.example.com/v1/orders' \\\n  -H 'Authorization: Bearer eyJ...' \\\n  -H 'X-Tenant-ID: acme' \\\n  --data-raw '{"dryRun":true}'`}
              spellCheck={false}
              className="w-full p-2.5 rounded bg-rf-deep border border-rf-border font-mono-code text-[11px] text-emerald-300 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCurlModal(false)}
                className="h-7 px-3 rounded bg-rf-hover hover:bg-rf-strong text-xs text-rf-3"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleImportCurl}
                className="h-7 px-3 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium"
              >
                {t.extractAddRules}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Toast */}
      {toast && (
        <div className="fixed bottom-8 right-3.5 px-3 py-1.5 rounded-md bg-rf-hover border border-rf-border-strong text-rf-1 text-[11px] font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
