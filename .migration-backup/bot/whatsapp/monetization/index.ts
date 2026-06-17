/**
 * Monetization module - dunning, notifications, and in-WhatsApp upgrade.
 */

// Register the !upgrade command (self-registering on import)
import './upgradeCommand';

// Export scheduler for integration with bot startup
export { startMonetizationScheduler, stopMonetizationScheduler } from './scheduler';

// Export dunning functions for webhook integration
export { handlePaymentFailed, resolveDunning } from './dunning';
