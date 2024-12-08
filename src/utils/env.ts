export const isTestEnv = () => {
  return typeof global.it === 'function' || process.env.CI === 'true'
}
