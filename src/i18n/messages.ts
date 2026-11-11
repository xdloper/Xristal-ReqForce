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
  inspectorSearchPlaceholder: string;
  inspectorFilterAll: string;
  inspectorFilterTokens: string;
  inspectorFilterMutated: string;
  inspectorFilterErrors: string;
  inspectorSelectHint: string;
  inspectorSourcePage: string;
  inspectorTargetUrl: string;
  inspectorTokenRadar: string;
  inspectorNoTokens: string;
  inspectorReqHeaders: string;
  inspectorResHeaders: string;
  inspectorQueryParams: string;
  inspectorReqBody: string;
  inspectorResBody: string;
  inspectorEmpty: string;
  inspectorAddAsHeaderRule: string;
  inspectorCopyBody: string;
  inspectorTabOutgoing: string;
  inspectorTabResponse: string;
  inspectorTabHeadersRaw: string;
  inspectorTabReplay: string;
  inspectorHowItGoes: string;
  inspectorOutgoingValues: string;
  inspectorNoOutgoingValues: string;
  inspectorDecodedJwt: string;
  inspectorMockThisResponse: string;
  inspectorOverrideRequestBody: string;
  inspectorBlockEndpoint: string;
  inspectorCopyCurl: string;
  inspectorCopyFetch: string;
  inspectorCopyAxios: string;
  inspectorCopyPython: string;
  inspectorMutateField: string;
  inspectorSendReplay: string;
  inspectorSendingReplay: string;
  inspectorReplayResult: string;
  inspectorOriginalVsMutated: string;
  inspectorShowRawJson: string;
  inspectorResponseFields: string;
  inspectorFilterChannelAll: string;
  graphqlOpFilterLabel: string;
  graphqlOpFilterPlaceholder: string;
  macrosHint: string;
  blockUrl: string;
  defaultBlockRuleName: string;
  tplReqIdMacro: string;
  varsButton: string;
  varsModalTitle: string;
  varsModalHint: string;
  varsBuiltInTitle: string;
  varsCustomTitle: string;
  varsAdd: string;
  varsKeyPlaceholder: string;
  varsValuePlaceholder: string;
  varsEmpty: string;
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
    'Page → API flow, headers, bodies & token radar (Header / Body / Query / Cookie).',
  noTraffic: 'No traffic captured yet. Open a page, click around, then Refresh.',
  inspectorSearchPlaceholder: 'Search URL, header, body, token...',
  inspectorFilterAll: 'All',
  inspectorFilterTokens: 'Has Token',
  inspectorFilterMutated: 'Mutated',
  inspectorFilterErrors: '4xx/5xx',
  inspectorSelectHint: 'Click a request on the left to inspect headers, payload, response & token channels.',
  inspectorSourcePage: 'From Page',
  inspectorTargetUrl: 'To Endpoint',
  inspectorTokenRadar: 'Token & Auth Radar (how tokens travel)',
  inspectorNoTokens: 'No auth token detected in headers, body, query, or cookies.',
  inspectorReqHeaders: 'Request Headers',
  inspectorResHeaders: 'Response Headers',
  inspectorQueryParams: 'Query Params',
  inspectorReqBody: 'Request Body',
  inspectorResBody: 'Response Body',
  inspectorEmpty: 'Empty',
  inspectorAddAsHeaderRule: '+ Rule',
  inspectorCopyBody: 'Copy',
  inspectorTabOutgoing: 'Outgoing Values',
  inspectorTabResponse: 'Response',
  inspectorTabHeadersRaw: 'Headers & Code',
  inspectorTabReplay: 'Replay',
  inspectorHowItGoes: 'How It Travels & Channels',
  inspectorOutgoingValues: 'Outgoing Values (Key → Value)',
  inspectorNoOutgoingValues: 'No query, body, or custom header parameters were sent in this request.',
  inspectorDecodedJwt: 'Decoded JWT Payload',
  inspectorMockThisResponse: 'Mock Response',
  inspectorOverrideRequestBody: 'Override Request',
  inspectorBlockEndpoint: 'Block',
  inspectorCopyCurl: 'cURL',
  inspectorCopyFetch: 'fetch()',
  inspectorCopyAxios: 'axios',
  inspectorCopyPython: 'Python',
  inspectorMutateField: 'Override',
  inspectorSendReplay: 'Send Replay',
  inspectorSendingReplay: 'Sending...',
  inspectorReplayResult: 'Live Replay Response',
  inspectorOriginalVsMutated: 'ReqForce Mutation (Original → Sent)',
  inspectorShowRawJson: 'Raw Payload',
  inspectorResponseFields: 'Response Fields (Key → Value)',
  inspectorFilterChannelAll: 'All',
  graphqlOpFilterLabel: 'GraphQL Operation (Optional)',
  graphqlOpFilterPlaceholder: 'e.g. GetUserProfile',
  macrosHint: 'Macros:',
  blockUrl: '+ Block URL',
  defaultBlockRuleName: 'Block Endpoint',
  tplReqIdMacro: 'Req ID ({{uuid}})',
  varsButton: '{{x}} Variables',
  varsModalTitle: 'Dynamic Macros & Custom {{Variables}}',
  varsModalHint: 'Use {{variableName}} inside any Header value, Query param, URL Redirect, or JSON Body. Click any chip to copy.',
  varsBuiltInTitle: 'Built-in Dynamic Macros (auto-generated on every request)',
  varsCustomTitle: 'Workspace Custom Variables',
  varsAdd: '+ Add Variable',
  varsKeyPlaceholder: 'variableName (e.g. myToken)',
  varsValuePlaceholder: 'Value (e.g. eyJhbGci...)',
  varsEmpty: 'No custom variables yet. Click "+ Add Variable" to define your own {{key}}.',
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
  settingsAuthor: 'ReqForce by Xristal',
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
    'Sayfa → API akışı, header/body değerleri ve token radarı (Header / Body / Query / Cookie).',
  noTraffic: 'Henüz trafik yok. Bir sayfa aç, dolaş, sonra Yenile’ye bas.',
  inspectorSearchPlaceholder: 'URL, header, body, token ara...',
  inspectorFilterAll: 'Tümü',
  inspectorFilterTokens: 'Token Var',
  inspectorFilterMutated: 'Mutasyonlu',
  inspectorFilterErrors: '4xx/5xx',
  inspectorSelectHint: 'Detaylı header, body, response ve token kanalını görmek için soldan bir istek seç.',
  inspectorSourcePage: 'Kaynak Sayfa',
  inspectorTargetUrl: 'Hedef Endpoint',
  inspectorTokenRadar: 'Token & Auth Radarı (token nereden gidiyor)',
  inspectorNoTokens: 'Header, body, query veya cookie içinde token tespit edilmedi.',
  inspectorReqHeaders: 'Giden Header’lar',
  inspectorResHeaders: 'Dönen Header’lar',
  inspectorQueryParams: 'Query Parametreleri',
  inspectorReqBody: 'Giden Body (Request)',
  inspectorResBody: 'Dönen Body (Response)',
  inspectorEmpty: 'Boş',
  inspectorAddAsHeaderRule: '+ Kural',
  inspectorCopyBody: 'Kopyala',
  inspectorTabOutgoing: 'Giden Değerler',
  inspectorTabResponse: 'Dönen Yanıt',
  inspectorTabHeadersRaw: 'Header & Kod',
  inspectorTabReplay: 'Tekrar Gönder',
  inspectorHowItGoes: 'Nasıl Gidiyor & Kanal Özeti',
  inspectorOutgoingValues: 'Giden Değerlerin İçi (Anahtar → Değer)',
  inspectorNoOutgoingValues: 'Bu istekte query, body veya özel header verisi gönderilmedi.',
  inspectorDecodedJwt: 'Çözümlenen JWT İçeriği',
  inspectorMockThisResponse: 'Yanıtı Mockla',
  inspectorOverrideRequestBody: 'Body Değiştir',
  inspectorBlockEndpoint: 'Engelle',
  inspectorCopyCurl: 'cURL',
  inspectorCopyFetch: 'fetch()',
  inspectorCopyAxios: 'axios',
  inspectorCopyPython: 'Python',
  inspectorMutateField: 'Değiştir',
  inspectorSendReplay: 'Tekrar Gönder',
  inspectorSendingReplay: 'Gönderiliyor...',
  inspectorReplayResult: 'Canlı Tekrar Gönderim Yanıtı',
  inspectorOriginalVsMutated: 'ReqForce Değişimi (Orijinal → Gönderilen)',
  inspectorShowRawJson: 'Ham Payload',
  inspectorResponseFields: 'Dönen Yanıt Değerleri (Anahtar → Değer)',
  inspectorFilterChannelAll: 'Tümü',
  graphqlOpFilterLabel: 'GraphQL Operation (İsteğe bağlı)',
  graphqlOpFilterPlaceholder: 'örn. GetUserProfile',
  macrosHint: 'Makrolar:',
  blockUrl: '+ URL Engelle',
  defaultBlockRuleName: 'Endpoint Engelle',
  tplReqIdMacro: 'Req ID ({{uuid}})',
  varsButton: '{{x}} Değişkenler',
  varsModalTitle: 'Dinamik Makrolar & Özel {{Değişkenler}}',
  varsModalHint: 'Herhangi bir Header değerinde, Query parametresinde, Redirect veya JSON Body içinde {{degiskenAdi}} olarak kullanabilirsin. Kopyalamak için tıkla.',
  varsBuiltInTitle: 'Hazır Dinamik Makrolar (her istekte otomatik üretilir)',
  varsCustomTitle: 'Workspace Özel Değişkenlerin',
  varsAdd: '+ Değişken Ekle',
  varsKeyPlaceholder: 'degiskenAdi (örn. tokenim)',
  varsValuePlaceholder: 'Değer (örn. eyJhbGci...)',
  varsEmpty: 'Henüz özel değişken yok. Kendi {{anahtar}} değişkenini tanımlamak için "+ Değişken Ekle"ye bas.',
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
  settingsAuthor: 'ReqForce by Xristal',
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
