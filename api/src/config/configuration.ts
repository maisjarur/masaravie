export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  geoapifyApiKey: process.env.GEOAPIFY_API_KEY || '',
  allowedOrigin: process.env.ALLOWED_ORIGIN || null,
  agentApiKeys: (process.env.AGENT_API_KEYS || '').split(',').filter(Boolean),
  nodeEnv: process.env.NODE_ENV || 'development',
});
