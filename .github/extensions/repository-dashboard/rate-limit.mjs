import { DashboardRequestError } from "./request-security.mjs";

export function createTokenBucket({ capacity, refillIntervalMs, clock = Date.now }) {
    const tokensPerMs = capacity / refillIntervalMs;
    let tokens = capacity;
    let lastRefillAt = clock();

    return {
        tryTake() {
            const now = clock();
            tokens = Math.min(capacity, tokens + (now - lastRefillAt) * tokensPerMs);
            lastRefillAt = now;
            if (tokens < 1) {
                return false;
            }
            tokens -= 1;
            return true;
        },
    };
}

export function consumeToken(bucket) {
    if (!bucket.tryTake()) {
        throw new DashboardRequestError(
            429,
            "Too many dashboard requests in a short window. Wait a moment and try again.",
        );
    }
}

export function createSingleFlightGuard() {
    const active = new Set();

    return {
        async run(key, operation) {
            if (active.has(key)) {
                throw new DashboardRequestError(
                    409,
                    "That request is already running. Wait for it to finish before starting another.",
                );
            }
            active.add(key);
            try {
                return await operation();
            } finally {
                active.delete(key);
            }
        },
    };
}

export function createRequestBudgets(budgets, clock = Date.now) {
    return Object.fromEntries(
        Object.entries(budgets).map(([name, limits]) => [
            name,
            createTokenBucket({ ...limits, clock }),
        ]),
    );
}
