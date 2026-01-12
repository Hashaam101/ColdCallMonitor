/**
 * Real-time Subscription Hook (Disabled)
 * 
 * Real-time features have been disabled to optimize cache and reduce bandwidth.
 * Users can now manually sync data using the "Sync Data" button in the sidebar.
 * 
 * This hook is kept for backwards compatibility but no longer subscribes to changes.
 */



// Disabled: Real-time cold calls subscription
// Use manual sync button instead for optimization
export function useRealtimeColdCalls() {
    // No-op - real-time disabled for optimization
}

// Disabled: Real-time alerts subscription
// Use manual sync button instead for optimization
export function useRealtimeAlerts() {
    // No-op - real-time disabled for optimization
}

// Disabled: Combined real-time subscriptions
// Use manual sync button in sidebar instead for optimization
export function useRealtime() {
    // No-op - real-time features disabled for cache optimization
    // Users can manually sync using the "Sync Data" button in the sidebar
}
