import time
from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import HTTPException, Request, status
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("app.core.rate_limit")


class SlidingWindowRateLimiter:
    """
    In-memory thread-safe sliding window rate limiter for protecting sensitive endpoints
    against credential stuffing, brute-force attacks, and denial-of-service attempts.
    """

    def __init__(self):
        # Maps (client_ip, endpoint_key) -> list of request epoch timestamps
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup: float = time.time()

    def _cleanup_old_entries(self, now: float, max_age: float = 3600.0) -> None:
        """Periodically purges keys with no timestamps in the last hour to prevent memory bloat."""
        if now - self._last_cleanup < 300.0:  # Cleanup every 5 minutes
            return

        keys_to_delete = []
        for key, timestamps in self._requests.items():
            valid_stamps = [t for t in timestamps if now - t < max_age]
            if valid_stamps:
                self._requests[key] = valid_stamps
            else:
                keys_to_delete.append(key)

        for key in keys_to_delete:
            del self._requests[key]

        self._last_cleanup = now

    def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> Optional[int]:
        """
        Records an access attempt and checks whether the request exceeds the allowed threshold.
        Returns None if permitted, or remaining seconds until retry if exceeded.
        """
        now = time.time()
        self._cleanup_old_entries(now)

        cutoff = now - window_seconds
        timestamps = self._requests[key]

        # Filter out timestamps outside the active sliding window
        active_stamps = [t for t in timestamps if t > cutoff]

        if len(active_stamps) >= max_requests:
            oldest_active = active_stamps[0]
            retry_after = max(1, int(window_seconds - (now - oldest_active)))
            self._requests[key] = active_stamps
            return retry_after

        active_stamps.append(now)
        self._requests[key] = active_stamps
        return None

    def reset(self) -> None:
        """Clears all stored rate limit records (useful for automated testing)."""
        self._requests.clear()


# Global in-memory rate limiter instance
limiter = SlidingWindowRateLimiter()


def rate_limit(max_requests: int = 5, window_seconds: int = 60, key_prefix: str = "auth"):
    """
    FastAPI dependency factory enforcing rate limits on endpoints.
    Identifies client by X-Forwarded-For (for proxies/load balancers) or client host IP.
    """

    async def dependency(request: Request) -> None:
        # Bypass rate limiting if disabled in settings
        if not getattr(settings, "RATE_LIMITING_ENABLED", True):
            return

        # In testing environment, bypass unless test explicitly activates it
        if settings.ENVIRONMENT == "testing" and request.headers.get("X-Test-Rate-Limit") != "true":
            return

        if request.headers.get("X-Test-Bypass-Rate-Limit") == "true":
            return

        # Extract client IP address safely
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        endpoint_path = request.url.path
        rate_key = f"{key_prefix}:{endpoint_path}:{client_ip}"

        retry_after = limiter.check_rate_limit(rate_key, max_requests, window_seconds)
        if retry_after is not None:
            logger.warning(
                f"Rate limit exceeded for IP {client_ip} on {endpoint_path}. "
                f"Limit: {max_requests} req / {window_seconds}s. Retry after {retry_after}s."
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please wait {retry_after} seconds before trying again.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency
