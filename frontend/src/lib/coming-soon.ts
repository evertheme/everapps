/**
 * Pre-launch "coming soon" marketing mode on Railway production.
 * When the product has launched, set LAUNCHED=true on the frontend service.
 */
export function isComingSoonMode(): boolean {
  const railwayProd =
    process.env.RAILWAY_ENVIRONMENT === 'production' ||
    process.env.RAILWAY_ENVIRONMENT_NAME === 'production';
  const launched = process.env.LAUNCHED === 'true';
  return railwayProd && !launched;
}
