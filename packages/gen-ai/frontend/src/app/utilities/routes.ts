const globNamespace = ':namespace';
export const globNamespaceAll = `/${globNamespace}?/*`;

export const genAiRootPath = '/gen-ai-studio';
export const globGenAiAll = `${genAiRootPath}/*`;

export const chatPlaygroundRootPath = `${genAiRootPath}/playground`;
export const globChatPlaygroundAll = `${chatPlaygroundRootPath}/*`;

export const aiAssetsRootPath = `${genAiRootPath}/assets`;
export const globAiAssetsAll = `${aiAssetsRootPath}/*`;

export const promptManagementRootPath = `${genAiRootPath}/prompt-management`;
export const globPromptManagementAll = `${promptManagementRootPath}/*`;

export const genAiChatPlaygroundRoute = (namespace?: string): string =>
  !namespace ? chatPlaygroundRootPath : `${chatPlaygroundRootPath}/${namespace}`;
export const genAiAiAssetsRoute = (namespace?: string): string =>
  !namespace ? aiAssetsRootPath : `${aiAssetsRootPath}/${namespace}`;
export const PROMPT_MANAGEMENT_DEFAULT_PATH = '/prompts';
export const PROMPT_MANAGEMENT_WORKSPACE_PARAM = 'workspace';

export const genAiPromptManagementRoute = (namespace?: string): string =>
  !namespace
    ? promptManagementRootPath
    : `${promptManagementRootPath}${PROMPT_MANAGEMENT_DEFAULT_PATH}?${PROMPT_MANAGEMENT_WORKSPACE_PARAM}=${namespace}`;