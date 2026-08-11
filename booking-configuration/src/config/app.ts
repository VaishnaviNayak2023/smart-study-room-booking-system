export const appConfig = {
  apiUrl: (import.meta.env.VITE_API_URL || '').replace(/\/$/, ''),
  appName: import.meta.env.VITE_APP_NAME || '',
  defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY || '',
};

export const getApiBaseUrl = () => {
  const base = appConfig.apiUrl ? `${appConfig.apiUrl}/api` : '/api';
  return base.replace(/\/$/, '');
};
