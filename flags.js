export default {
  ENABLE_SIGNALS: process.env.ENABLE_SIGNALS === 'true',
  ENABLE_UNCERTAINTY: process.env.ENABLE_UNCERTAINTY === 'true',
  ENABLE_QMATCH: process.env.ENABLE_QMATCH === 'true',
  ENABLE_INTUITION: process.env.ENABLE_INTUITION === 'true',
  ENABLE_BANDITS: process.env.ENABLE_BANDITS === 'true',
};