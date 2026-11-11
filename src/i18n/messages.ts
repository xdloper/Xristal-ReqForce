export type LocaleCode = 'en' | 'tr';
export type LocalePreference = 'system' | LocaleCode;

export type Messages = {
  active: string;
  passive: string;
  enablePauseTitle: string;
  pausedBanner: string;
  enableNow: string;
  wildcardWarning: string;
  pinDomain: string;
  pinDomainTitle: string;
  filterPlaceholder: string;
  tabHeaders: string;
  tabBody: string;
  tabRouting: string;
  tabInspector: string;
  tabSettings: string;
  importCurl: string;
  importCurlTitle: string;
  reloadTabTitle: string;
  exportJson: string;
  importJson: string;
  workspaceNamePlaceholder: string;
  add: string;
  newWorkspace: string;
  deleteWorkspace: string;
  enableAll: string;
  disableAll: string;
  addRule: string;
  colTargetAction: string;
  colHeaderName: string;
  colHeaderValue: string;
  colUrlPattern: string;
  noHeaderRules: string;
  headerNamePlaceholder: string;
  headerValuePlaceholder: string;
  headerWillBeStripped: string;
  duplicateRule: string;
  deleteRule: string;
  set: string;
  append: string;
  remove: string;
  bodyRules: string;
  new: string;
  noBodyRules: string;
  selectBodyRule: string;
  ruleName: string;
  ruleNamePlaceholder: string;
  mutationStrategy: string;
  modeMergeResponse: string;
  modeReplaceResponse: string;
  modeMergeRequest: string;
  modeReplaceRequest: string;
  method: string;
  urlPatternLabel: string;
  httpStatus: string;
  delayMs: string;
  jsonPayload: string;
  formatJson: string;
  corsSectionTitle: string;
  corsBypass: string;
  queryParam: string;
  urlRedirect: string;
  noRoutingRules: string;
  sourceUrlPlaceholder: string;
  clusterTitle: string;
  clusterHint: string;
  interceptId: string;
  interceptPlaceholder: string;
  copyId: string;
  otelBaggage: string;
  customContextHeader: string;
  value: string;
  targetHostScope: string;
  syncInterceptBaggage: string;
  injectEnvoyTrace: string;
  liveTraffic: string;
  monitorAll: string;
  refresh: string;
  clear: string;
  inspectorHint: string;
  noTraffic: string;
  inspectorFilterPlaceholder: string;
  inspectorFilterAll: string;
  inspectorFilterAuth: string;
  inspectorFilterHeaderAuth: string;
  inspectorFilterBodyAuth: string;
  inspectorFilterQueryAuth: string;
  inspectorFilterCookieAuth: string;
  inspectorFilterMutated: string;
  inspectorSelectHint: string;
  inspectorPageOrigin: string;
  inspectorTargetUrl: string;
  inspectorAuthTitle: string;
  inspectorNoAuthDetected: string;
  inspectorReqHeaders: string;
  inspectorResHeaders: string;
  inspectorQueryParams: string;
  inspectorReqBody: string;
  inspectorResPreview: string;
  inspectorCreateHeaderRule: string;
  inspectorCreateBodyRule: string;
  inspectorRuleCreated: string;
  tabScope: string;
  curlModalTitle: string;
  curlModalHint: string;
  cancel: string;
  extractAddRules: string;
  language: string;
  languageSystem: string;
  languageEn: string;
  languageTr: string;
  theme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  settingsAppearance: string;
  settingsAppearanceHint: string;
  settingsAbout: string;
  settingsVersion: string;
  settingsAuthor: string;
  settingsStructure: string;
  settingsStructureHint: string;
  toastOpenHttpTab: string;
  toastScoped: string;
  toastImported: string;
  toastImportedBodySuffix: string;
  toastDuplicated: string;
  toastWorkspaceCreated: string;
  toastWorkspaceRemoved: string;
  toastExported: string;
  toastImportedConfig: string;
  toastInvalidJson: string;
  toastReloaded: string;
  toastFormattedJson: string;
  toastInvalidJsonSyntax: string;
  tplBearer: string;
  tplApiKey: string;
  tplNoCache: string;
  tplSpoofIp: string;
  tplTenantId: string;
  tplStripCsp: string;
  defaultBodyRuleName: string;
  defaultCorsBypassName: string;
  defaultQueryParamName: string;
  defaultRedirectName: string;
  newEndpointOverride: string;
};

export const en: Messages = {
  active: 'ACTIVE',
  passive: 'PAUSED',
  enablePauseTitle: 'Enable or pause all extension interceptions',
  pausedBanner:
    'Extension is currently PAUSED — no HTTP headers, redirects, or body rules are being applied.',
  enableNow: 'Enable Now',
  wildcardWarning:
    'Warning: an enabled header rule uses URL filter * on an auth-sensitive header. Prefer Pin Domain so YouTube / banking / login sites keep their cookies & Bearer tokens intact.',
  pinDomain: 'Pin Domain',
  pinDomainTitle: 'Scope rules to active tab',
  filterPlaceholder: 'Filter...',
  tabHeaders: 'Headers',
  tabBody: 'Body',
  tabRouting: 'Routing',
  tabInspector: 'Inspector',
  tabSettings: 'Settings',
  importCurl: 'Import cURL',
  importCurlTitle: 'Import headers & body from a cURL command',
  reloadTabTitle: 'Reload Active Tab',
  exportJson: 'Export JSON',
  importJson: 'Import JSON',
  workspaceNamePlaceholder: 'Workspace name...',
  add: 'Add',
  newWorkspace: 'New Workspace',
  deleteWorkspace: 'Delete Workspace',
  enableAll: 'Enable All',
  disableAll: 'Disable All',
  addRule: 'Add Rule',
  colTargetAction: 'Target & Action',
  colHeaderName: 'Header Name',
  colHeaderValue: 'Header Value',
  colUrlPattern: 'URL Pattern',
  noHeaderRules:
    'No HTTP header rules match. Click “Add Rule”, “Import cURL”, or pick a template.',
  headerNamePlaceholder: 'Header-Name',
  headerValuePlaceholder: 'Value...',
  headerWillBeStripped: 'Header will be stripped',
  duplicateRule: 'Duplicate rule',
  deleteRule: 'Delete rule',
  set: 'Set',
  append: 'Append',
  remove: 'Remove',
  bodyRules: 'Body Rules',
  new: 'New',
  noBodyRules: 'No body rules yet.',
  selectBodyRule: 'Create or select a rule on the left to configure body manipulation.',
  ruleName: 'Rule Name',
  ruleNamePlaceholder: 'e.g. Override Feature Flags',
  mutationStrategy: 'Mutation Strategy',
  modeMergeResponse: 'Response: Shallow Merge JSON Keys',
  modeReplaceResponse: 'Response: Full Body Replace (Mock Endpoint)',
  modeMergeRequest: 'Request: Shallow Merge Outgoing JSON',
  modeReplaceRequest: 'Request: Replace Outgoing Body',
  method: 'Method',
  urlPatternLabel: 'URL Pattern (Substring or Wildcard *)',
  httpStatus: 'HTTP Status',
  delayMs: 'Delay (ms)',
  jsonPayload: 'JSON / Text Payload',
  formatJson: 'Format JSON',
  corsSectionTitle: 'CORS, Query Params & URL Redirects',
  corsBypass: '+ CORS Bypass',
  queryParam: '+ Query Param',
  urlRedirect: '+ URL Redirect',
  noRoutingRules: 'No active CORS, Query Param, or Redirect rules.',
  sourceUrlPlaceholder: 'Source URL filter (* or ^https://api\\.prod\\.com/(.*))',
  clusterTitle: 'Cluster & Mesh Context Propagation (Optional)',
  clusterHint:
    'Inject W3C OpenTelemetry baggage, Envoy trace flags, or Kubernetes Telepresence intercept headers.',
  interceptId: 'Intercept ID (x-telepresence-intercept-id)',
  interceptPlaceholder: 'Paste ID or CLI output...',
  copyId: 'Copy ID',
  otelBaggage: 'W3C OpenTelemetry Baggage',
  customContextHeader: 'Custom Context Header',
  value: 'Value',
  targetHostScope: 'Target Host Scope',
  syncInterceptBaggage: 'Sync Intercept ID into W3C baggage',
  injectEnvoyTrace: 'Inject x-envoy-force-trace: true',
  liveTraffic: 'Live Traffic',
  monitorAll: 'Monitor all fetch/XHR',
  refresh: 'Refresh',
  clear: 'Clear',
  inspectorHint:
    'Shows what the page is sending (method, URL, status, credentials mode, visible headers). Mutated requests are highlighted — disable the matching rule if a site breaks.',
  noTraffic: 'No traffic captured yet. Open a page, click around, then Refresh.',
  inspectorFilterPlaceholder: 'Search URL, header, body, token key...',
  inspectorFilterAll: 'All',
  inspectorFilterAuth: 'Has Token/Auth',
  inspectorFilterHeaderAuth: 'Auth in Header',
  inspectorFilterBodyAuth: 'Auth in Body',
  inspectorFilterQueryAuth: 'Auth in Query',
  inspectorFilterCookieAuth: 'Cookie',
  inspectorFilterMutated: 'Mutated',
  inspectorSelectHint: 'Select a request on the left to inspect Page → Target flow, token carriers, headers, and payloads.',
  inspectorPageOrigin: 'Source Page',
  inspectorTargetUrl: 'Target Endpoint',
  inspectorAuthTitle: 'Token & Auth Carrier Analysis',
  inspectorNoAuthDetected: 'No explicit token detected in headers, query, or body.',
  inspectorReqHeaders: 'Request Headers',
  inspectorResHeaders: 'Response Headers',
  inspectorQueryParams: 'Query Parameters',
  inspectorReqBody: 'Request Body (Raw)',
  inspectorResPreview: 'Response Preview',
  inspectorCreateHeaderRule: '+ Rule',
  inspectorCreateBodyRule: '+ Mock / Body Rule',
  inspectorRuleCreated: 'Rule added to active workspace',
  tabScope: 'Tab Scope',
  curlModalTitle: 'Import Rules from cURL',
  curlModalHint:
    'Right-click any network request in DevTools → Copy as cURL and paste below. Headers (-H) and request payloads (--data-raw) will be extracted automatically.',
  cancel: 'Cancel',
  extractAddRules: 'Extract & Add Rules',
  language: 'Language',
  languageSystem: 'Auto',
  languageEn: 'EN',
  languageTr: 'TR',
  theme: 'Theme',
  themeSystem: 'Auto',
  themeLight: 'Light',
  themeDark: 'Dark',
  settingsAppearance: 'Language & Theme',
  settingsAppearanceHint: 'Follow the system by default, or lock English / Turkish and Light / Dark.',
  settingsAbout: 'About',
  settingsVersion: 'Version',
  settingsAuthor: 'ReqForge by Xristal',
  settingsStructure: 'Workspace & Data',
  settingsStructureHint: 'Export / import rule JSON and reload the active tab.',
  toastOpenHttpTab: 'Open an HTTP/HTTPS tab first',
  toastScoped: 'Scoped rules to {pattern}',
  toastImported: 'Imported {n} headers{body}',
  toastImportedBodySuffix: ' + 1 body rule',
  toastDuplicated: 'Rule duplicated',
  toastWorkspaceCreated: 'Workspace "{name}" created',
  toastWorkspaceRemoved: 'Workspace removed',
  toastExported: 'Exported configuration',
  toastImportedConfig: 'Configuration imported',
  toastInvalidJson: 'Invalid JSON file',
  toastReloaded: 'Reloaded active tab',
  toastFormattedJson: 'Formatted JSON',
  toastInvalidJsonSyntax: 'Invalid JSON syntax',
  tplBearer: 'Bearer Auth',
  tplApiKey: 'API Key',
  tplNoCache: 'No Cache',
  tplSpoofIp: 'Spoof IP',
  tplTenantId: 'Tenant ID',
  tplStripCsp: 'Strip CSP',
  defaultBodyRuleName: 'New Endpoint Override',
  defaultCorsBypassName: 'Global CORS Bypass',
  defaultQueryParamName: 'Query Parameter',
  defaultRedirectName: 'Route to Localhost',
  newEndpointOverride: 'New Endpoint Override',
};

export const tr: Messages = {
  active: 'AKTİF',
  passive: 'PASİF',
  enablePauseTitle: 'Tüm eklenti yakalamalarını aç veya duraklat',
  pausedBanner:
    'Eklenti şu an PASİF — HTTP header, yönlendirme veya body kuralları uygulanmıyor.',
  enableNow: 'Şimdi Aç',
  wildcardWarning:
    'Uyarı: etkin bir header kuralı auth-hassas bir header için URL filtresi * kullanıyor. Cookie ve Bearer bozulmasın diye Pin Domain tercih et.',
  pinDomain: 'Domain Sabitle',
  pinDomainTitle: 'Kuralları aktif sekmeye sınırla',
  filterPlaceholder: 'Filtrele...',
  tabHeaders: 'Header',
  tabBody: 'Body',
  tabRouting: 'Routing',
  tabInspector: 'Inspector',
  tabSettings: 'Ayarlar',
  importCurl: 'cURL İçe Aktar',
  importCurlTitle: 'cURL komutundan header ve body içe aktar',
  reloadTabTitle: 'Aktif Sekmeyi Yenile',
  exportJson: 'JSON Dışa Aktar',
  importJson: 'JSON İçe Aktar',
  workspaceNamePlaceholder: 'Workspace adı...',
  add: 'Ekle',
  newWorkspace: 'Yeni Workspace',
  deleteWorkspace: 'Workspace Sil',
  enableAll: 'Tümünü Aç',
  disableAll: 'Tümünü Kapat',
  addRule: 'Kural Ekle',
  colTargetAction: 'Hedef & İşlem',
  colHeaderName: 'Header Adı',
  colHeaderValue: 'Header Değeri',
  colUrlPattern: 'URL Deseni',
  noHeaderRules:
    'Eşleşen HTTP header kuralı yok. “Kural Ekle”, “cURL İçe Aktar” veya bir şablon seç.',
  headerNamePlaceholder: 'Header-Adı',
  headerValuePlaceholder: 'Değer...',
  headerWillBeStripped: 'Header kaldırılacak',
  duplicateRule: 'Kuralı çoğalt',
  deleteRule: 'Kuralı sil',
  set: 'Set',
  append: 'Append',
  remove: 'Remove',
  bodyRules: 'Body Kuralları',
  new: 'Yeni',
  noBodyRules: 'Henüz body kuralı yok.',
  selectBodyRule: 'Body manipülasyonu için soldan bir kural seç veya oluştur.',
  ruleName: 'Kural Adı',
  ruleNamePlaceholder: 'örn. Feature Flag Override',
  mutationStrategy: 'Mutasyon Stratejisi',
  modeMergeResponse: 'Response: JSON Anahtarlarını Birleştir',
  modeReplaceResponse: 'Response: Tam Body Değiştir (Mock)',
  modeMergeRequest: 'Request: Giden JSON Birleştir',
  modeReplaceRequest: 'Request: Giden Body Değiştir',
  method: 'Method',
  urlPatternLabel: 'URL Deseni (Alt metin veya Wildcard *)',
  httpStatus: 'HTTP Status',
  delayMs: 'Gecikme (ms)',
  jsonPayload: 'JSON / Metin Payload',
  formatJson: 'JSON Formatla',
  corsSectionTitle: 'CORS, Query Param & URL Yönlendirme',
  corsBypass: '+ CORS Bypass',
  queryParam: '+ Query Param',
  urlRedirect: '+ URL Redirect',
  noRoutingRules: 'Aktif CORS, Query Param veya Redirect kuralı yok.',
  sourceUrlPlaceholder: 'Kaynak URL filtresi (* veya ^https://api\\.prod\\.com/(.*))',
  clusterTitle: 'Cluster & Mesh Context (İsteğe bağlı)',
  clusterHint:
    'W3C OpenTelemetry baggage, Envoy trace flag veya Telepresence intercept header enjekte et.',
  interceptId: 'Intercept ID (x-telepresence-intercept-id)',
  interceptPlaceholder: 'ID veya CLI çıktısı yapıştır...',
  copyId: 'ID Kopyala',
  otelBaggage: 'W3C OpenTelemetry Baggage',
  customContextHeader: 'Özel Context Header',
  value: 'Değer',
  targetHostScope: 'Hedef Host Kapsamı',
  syncInterceptBaggage: 'Intercept ID’yi W3C baggage’e yaz',
  injectEnvoyTrace: 'x-envoy-force-trace: true enjekte et',
  liveTraffic: 'Canlı Trafik',
  monitorAll: 'Tüm fetch/XHR izle',
  refresh: 'Yenile',
  clear: 'Temizle',
  inspectorHint:
    'Sayfanın ne gönderdiğini gösterir (method, URL, status, credentials, görünen header’lar). Mutasyonlu satırlar vurgulanır — site bozulursa eşleşen kuralı kapat.',
  noTraffic: 'Henüz trafik yok. Bir sayfa aç, dolaş, sonra Yenile’ye bas.',
  inspectorFilterPlaceholder: 'URL, header, body veya token anahtarı ara...',
  inspectorFilterAll: 'Tümü',
  inspectorFilterAuth: 'Token/Auth Var',
  inspectorFilterHeaderAuth: 'Header’da Token',
  inspectorFilterBodyAuth: 'Body’de Token',
  inspectorFilterQueryAuth: 'Query’de Token',
  inspectorFilterCookieAuth: 'Cookie',
  inspectorFilterMutated: 'Mutasyonlu',
  inspectorSelectHint: 'Sayfa → Hedef akışını, token’ın nereden gittiğini, header ve body değerlerini görmek için soldan bir istek seç.',
  inspectorPageOrigin: 'Kaynak Sayfa',
  inspectorTargetUrl: 'Hedef Endpoint',
  inspectorAuthTitle: 'Token & Auth Taşıyıcı Analizi',
  inspectorNoAuthDetected: 'Header, query veya body içinde açık token tespit edilmedi.',
  inspectorReqHeaders: 'Request Header’ları',
  inspectorResHeaders: 'Response Header’ları',
  inspectorQueryParams: 'Query Parametreleri',
  inspectorReqBody: 'Request Body (Ham Değer)',
  inspectorResPreview: 'Response Önizleme',
  inspectorCreateHeaderRule: '+ Kural Yap',
  inspectorCreateBodyRule: '+ Body / Mock Kuralı Yap',
  inspectorRuleCreated: 'Kural aktif workspace’e eklendi',
  tabScope: 'Sekme Kapsamı',
  curlModalTitle: 'cURL’den Kural İçe Aktar',
  curlModalHint:
    'DevTools’ta bir network isteğine sağ tık → Copy as cURL yapıştır. Header’lar (-H) ve payload’lar (--data-raw) otomatik çıkarılır.',
  cancel: 'İptal',
  extractAddRules: 'Çıkar & Kural Ekle',
  language: 'Dil',
  languageSystem: 'Otomatik',
  languageEn: 'EN',
  languageTr: 'TR',
  theme: 'Tema',
  themeSystem: 'Otomatik',
  themeLight: 'Açık',
  themeDark: 'Koyu',
  settingsAppearance: 'Dil & Tema',
  settingsAppearanceHint: 'Varsayılan olarak sistemi takip eder; dil ve temayı elle sabitleyebilirsin.',
  settingsAbout: 'Hakkında',
  settingsVersion: 'Sürüm',
  settingsAuthor: 'ReqForge by Xristal',
  settingsStructure: 'Workspace & Veri',
  settingsStructureHint: 'Kural JSON dışa/içe aktar ve aktif sekmeyi yenile.',
  toastOpenHttpTab: 'Önce bir HTTP/HTTPS sekmesi aç',
  toastScoped: 'Kurallar {pattern} ile sınırlandı',
  toastImported: '{n} header{body} içe aktarıldı',
  toastImportedBodySuffix: ' + 1 body kuralı',
  toastDuplicated: 'Kural çoğaltıldı',
  toastWorkspaceCreated: '"{name}" workspace oluşturuldu',
  toastWorkspaceRemoved: 'Workspace silindi',
  toastExported: 'Yapılandırma dışa aktarıldı',
  toastImportedConfig: 'Yapılandırma içe aktarıldı',
  toastInvalidJson: 'Geçersiz JSON dosyası',
  toastReloaded: 'Aktif sekme yenilendi',
  toastFormattedJson: 'JSON formatlandı',
  toastInvalidJsonSyntax: 'Geçersiz JSON sözdizimi',
  tplBearer: 'Bearer Auth',
  tplApiKey: 'API Key',
  tplNoCache: 'No Cache',
  tplSpoofIp: 'Spoof IP',
  tplTenantId: 'Tenant ID',
  tplStripCsp: 'Strip CSP',
  defaultBodyRuleName: 'Yeni Endpoint Override',
  defaultCorsBypassName: 'Global CORS Bypass',
  defaultQueryParamName: 'Query Parameter',
  defaultRedirectName: 'Localhost’a Yönlendir',
  newEndpointOverride: 'Yeni Endpoint Override',
};

const catalogs: Record<LocaleCode, Messages> = { en, tr };

export function detectSystemLocale(): LocaleCode {
  try {
    const lang =
      (typeof navigator !== 'undefined' &&
        (navigator.languages?.[0] || navigator.language)) ||
      'en';
    return lang.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

export function resolveLocale(pref: LocalePreference | undefined): LocaleCode {
  if (pref === 'en' || pref === 'tr') return pref;
  return detectSystemLocale();
}

export function getMessages(pref: LocalePreference | undefined): Messages {
  return catalogs[resolveLocale(pref)];
}

export function fill(
  template: string,
  vars: Record<string, string | number>
): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template
  );
}
